"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTodayKey } from "@/components/calendar/course_calendar"
import type { AppointmentSlot } from "@/lib/appointments"
import { createSlot, deleteSlot, validateSlotInput } from "@/lib/availability"
import { buildRangePlan, MAX_RANGE_DAYS } from "@/lib/availability_range"

type Status = "available" | "unavailable"

const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

// Right card: mark every date in a start-to-end range available (one slot per date) or unavailable (removes the
// slots). Dates that already have slots are skipped when marking available; past dates are never changed.
export default function QuickSelectCard({
    courseId,
    slots,
    canEdit,
    checking,
    loading,
    hostEmail,
    hostRole,
    permissionNote,
    onChanged,
}: {
    courseId: string
    slots: AppointmentSlot[] // every slot of the course
    canEdit: boolean // lecturer or TA of this course
    checking: boolean // still finding out the user's role
    loading: boolean // slots still loading
    hostEmail: string
    hostRole: "lecturer" | "ta"
    permissionNote: string | null
    onChanged: () => void // ask the page to reload the slots
}) {
    const todayKey = useTodayKey()

    // the range starts as today and the end follows the start until a different end is picked
    const [startPick, setStartPick] = useState<string | null>(null)
    const [endPick, setEndPick] = useState<string | null>(null)
    const start = startPick ?? todayKey
    const end = endPick ?? start

    const [action, setAction] = useState<Status>("available")
    const [days, setDays] = useState<boolean[]>(() => Array(7).fill(true))
    const [startTime, setStartTime] = useState("09:00")
    const [endTime, setEndTime] = useState("12:00")
    const [max, setMax] = useState("5")
    const [problem, setProblem] = useState("")
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const saving = progress !== null
    const plan = useMemo(() => buildRangePlan(start, end, days, slots, todayKey), [start, end, days, slots, todayKey])

    const lockedReason = loading || checking
        ? "Loading..."
        : !canEdit
          ? (permissionNote ?? "You can't change availability here.")
          : null

    const toggleDay = (index: number) => setDays((prev) => prev.map((on, i) => (i === index ? !on : on)))

    async function markAvailable() {
        if (plan.error !== null) return
        const issue = validateSlotInput({ start: startTime, end: endTime, max })
        if (issue) {
            setProblem(issue)
            return
        }
        setProblem("")
        const total = plan.toCreate.length
        setProgress({ done: 0, total })
        let created = 0
        let failure = ""
        for (const date of plan.toCreate) {
            try {
                await createSlot(courseId, { date, startTime, endTime, maxBookings: Number(max), hostEmail, hostRole })
                created++
                setProgress({ done: created, total })
            } catch (err) {
                failure = err instanceof Error ? err.message : "Couldn't mark this date as available."
                break
            }
        }
        setProgress(null)
        if (created > 0) onChanged() // reload even after a partial failure so the page shows what was saved
        if (failure) {
            toast.error(created > 0 ? `Marked ${created} of ${total} dates as available. ${failure}` : failure)
        } else {
            toast.success(`Marked ${plural(created, "date")} as available`)
        }
    }

    async function markUnavailable() {
        if (plan.error !== null) return
        const total = plan.toRemove.length
        setProgress({ done: 0, total })
        let removed = 0
        let failure = ""
        for (const slot of plan.toRemove) {
            try {
                await deleteSlot(courseId, slot.id)
                removed++
                setProgress({ done: removed, total })
            } catch (err) {
                failure = err instanceof Error ? err.message : "Couldn't remove this slot."
                break
            }
        }
        setProgress(null)
        setConfirmOpen(false)
        if (removed > 0) onChanged()
        if (failure) {
            toast.error(removed > 0 ? `Removed ${removed} of ${plural(total, "slot")}. ${failure}` : failure)
        } else {
            toast.success(`Removed ${plural(removed, "slot")}`)
        }
    }

    // what the button would do right now, in words
    const summary = (() => {
        if (plan.error !== null) return plan.error
        const skipped = plan.pastSkipped > 0 ? ` ${plural(plan.pastSkipped, "past date")} will be skipped.` : ""
        if (action === "available") {
            const already = plan.alreadyAvailable > 0 ? ` ${plural(plan.alreadyAvailable, "date")} already available will be skipped.` : ""
            return plan.toCreate.length === 0
                ? `Nothing to mark available in this range.${already}${skipped}`
                : `${plural(plan.toCreate.length, "date")} will be marked available, with one slot each.${already}${skipped}`
        }
        const dates = new Set(plan.toRemove.map((s) => s.date)).size
        return plan.toRemove.length === 0
            ? `Nothing to remove in this range.${skipped}`
            : `${plural(plan.toRemove.length, "slot")} on ${plural(dates, "date")} will be removed` +
                  (plan.bookings > 0 ? `, cancelling ${plural(plan.bookings, "student booking")}.` : ".") +
                  skipped
    })()

    const nothingToDo =
        plan.error !== null || (action === "available" ? plan.toCreate.length === 0 : plan.toRemove.length === 0)

    return (
        <Card className="flex min-w-0 flex-col gap-5 bg-gray-100 p-7 shadow-lg">
            <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">Quick select</h3>
                <p className="text-sm text-gray-500">
                    Mark every date in a range as available or unavailable (up to {MAX_RANGE_DAYS} days).
                </p>
            </div>

            {lockedReason ? (
                <p className="text-sm text-gray-500">{lockedReason}</p>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex flex-col gap-1.5 text-sm font-medium">
                            <label htmlFor="qs-start">Start date</label>
                            <Input id="qs-start" type="date" value={start} onChange={(e) => setStartPick(e.target.value)} disabled={saving} className="bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5 text-sm font-medium">
                            <label htmlFor="qs-end">End date</label>
                            <Input id="qs-end" type="date" value={end} min={start || undefined} onChange={(e) => setEndPick(e.target.value)} disabled={saving} className="bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5 text-sm font-medium">
                            <label htmlFor="qs-action">Mark the range as</label>
                            <select
                                id="qs-action"
                                value={action}
                                disabled={saving}
                                onChange={(e) => {
                                    setAction(e.target.value as Status)
                                    setProblem("")
                                }}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-base font-normal disabled:opacity-60"
                            >
                                <option value="available">Available</option>
                                <option value="unavailable">Unavailable</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-sm font-medium">
                        <span id="qs-days-label">Days of the week</span>
                        <div role="group" aria-labelledby="qs-days-label" className="flex flex-wrap gap-2">
                            {weekDays.map((label, i) => (
                                <button
                                    key={label}
                                    type="button"
                                    aria-pressed={days[i]}
                                    disabled={saving}
                                    onClick={() => toggleDay(i)}
                                    className={`h-9 w-11 rounded-md border text-sm font-semibold transition-colors disabled:opacity-60 ${
                                        days[i]
                                            ? "border-brand bg-brand text-brand-foreground"
                                            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {action === "available" && (
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="flex flex-col gap-1.5 text-sm font-medium">
                                <label htmlFor="qs-start-time">Slot start</label>
                                <Input id="qs-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={saving} className="bg-white" />
                            </div>
                            <div className="flex flex-col gap-1.5 text-sm font-medium">
                                <label htmlFor="qs-end-time">Slot end</label>
                                <Input id="qs-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={saving} className="bg-white" />
                            </div>
                            <div className="flex flex-col gap-1.5 text-sm font-medium">
                                <label htmlFor="qs-max">Max students</label>
                                <Input id="qs-max" type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} disabled={saving} className="bg-white" />
                            </div>
                        </div>
                    )}

                    <p className="text-sm" aria-live="polite">{summary}</p>
                    {problem && <p role="alert" className="text-sm text-red-600">{problem}</p>}

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant={action === "available" ? "default" : "destructive"}
                            disabled={saving || nothingToDo}
                            onClick={() => (action === "available" ? void markAvailable() : setConfirmOpen(true))}
                            className="h-9"
                        >
                            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                            {saving
                                ? `Working... ${progress.done}/${progress.total}`
                                : action === "available"
                                  ? "Mark range as available"
                                  : "Mark range as unavailable"}
                        </Button>
                    </div>
                </>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !saving && setConfirmOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mark this range as unavailable?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {summary}
                            {plan.error === null && plan.bookings > 0 ? " The students won't be notified." : ""}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={saving}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={(event) => {
                                event.preventDefault()
                                void markUnavailable()
                            }}
                        >
                            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                            {saving ? `Removing... ${progress.done}/${progress.total}` : "Mark unavailable"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
