"use client"

import { useState } from "react"
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
import { formatLongDate, type AppointmentSlot } from "@/lib/appointments"
import { createSlot, deleteSlot, validateSlotInput } from "@/lib/availability"

type Status = "available" | "unavailable"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

// Left card: set the calendar's selected date to Available (creates a slot) or Unavailable (removes its slots).
// The parent gives it key={date}, so its form state resets whenever another date is selected.
export default function DateAvailabilityCard({
    courseId,
    date,
    daySlots,
    canEdit,
    checking,
    loading,
    hostEmail,
    hostRole,
    permissionNote,
    onChanged,
}: {
    courseId: string
    date: string // YYYY-MM-DD, "" until the browser knows today
    daySlots: AppointmentSlot[] // slots on this date
    canEdit: boolean // lecturer or TA of this course
    checking: boolean // still finding out whether the user is a lecturer
    loading: boolean // slots still loading
    hostEmail: string
    hostRole: "lecturer" | "ta"
    permissionNote: string | null // why the controls are locked, when it is a permission problem
    onChanged: () => void // ask the page to reload the slots
}) {
    const todayKey = useTodayKey()

    const [choice, setChoice] = useState<Status | null>(null)
    const [start, setStart] = useState("09:00")
    const [end, setEnd] = useState("12:00")
    const [max, setMax] = useState("5")
    const [problem, setProblem] = useState("")
    const [saving, setSaving] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const currentStatus: Status = daySlots.length > 0 ? "available" : "unavailable"
    const value = choice ?? currentStatus
    const bookedStudents = daySlots.reduce((sum, s) => sum + s.booked, 0)

    const lockedReason = loading || checking || !date
        ? "Loading..."
        : !canEdit
          ? (permissionNote ?? "You can't change availability here.")
          : date < todayKey
            ? "Past dates can't be changed."
            : null

    async function markAvailable() {
        const issue = validateSlotInput({ start, end, max })
        if (issue) {
            setProblem(issue)
            return
        }
        setProblem("")
        setSaving(true)
        try {
            await createSlot(courseId, { date, startTime: start, endTime: end, maxBookings: Number(max), hostEmail, hostRole })
            toast.success("Date marked as available")
            setChoice(null)
            onChanged()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't mark this date as available.")
        } finally {
            setSaving(false)
        }
    }

    async function markUnavailable() {
        setSaving(true)
        let removed = 0
        let failure = ""
        for (const slot of daySlots) {
            try {
                await deleteSlot(courseId, slot.id)
                removed++
            } catch (err) {
                failure = err instanceof Error ? err.message : "Couldn't remove this slot."
                break
            }
        }
        setSaving(false)
        setConfirmOpen(false)
        if (removed > 0) onChanged() // reload even after a partial failure so the page shows what is left
        if (failure) {
            toast.error(removed > 0 ? `Removed ${removed} of ${daySlots.length} slots. ${failure}` : failure)
        } else {
            toast.success("Date marked as unavailable")
            setChoice(null)
        }
    }

    return (
        <Card className="flex min-w-0 flex-col gap-4 bg-gray-100 p-7 shadow-lg">
            <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">Selected date</h3>
                <p className="text-sm text-gray-500">{date ? formatLongDate(date) : "\u00a0"}</p>
            </div>

            <div className="flex flex-col gap-1.5 text-sm font-medium">
                <label htmlFor="availability-status">Status</label>
                <select
                    id="availability-status"
                    value={value}
                    disabled={lockedReason !== null || saving}
                    onChange={(e) => {
                        setChoice(e.target.value as Status)
                        setProblem("")
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-base font-normal disabled:opacity-60"
                >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                </select>
            </div>

            {lockedReason ? (
                <p className="text-sm text-gray-500">{lockedReason}</p>
            ) : value === "available" && currentStatus === "unavailable" ? (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5 text-sm font-medium">
                            <label htmlFor="availability-start">Start</label>
                            <Input id="availability-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} disabled={saving} className="bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5 text-sm font-medium">
                            <label htmlFor="availability-end">End</label>
                            <Input id="availability-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} disabled={saving} className="bg-white" />
                        </div>
                        <div className="col-span-2 flex flex-col gap-1.5 text-sm font-medium">
                            <label htmlFor="availability-max">Max students</label>
                            <Input id="availability-max" type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} disabled={saving} className="bg-white" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">Creates one slot with you as the host.</p>
                    {problem && <p role="alert" className="text-sm text-red-600">{problem}</p>}
                    <Button type="button" onClick={() => void markAvailable()} disabled={saving} className="h-9">
                        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                        {saving ? "Saving..." : "Mark available"}
                    </Button>
                </>
            ) : value === "unavailable" && currentStatus === "available" ? (
                <>
                    <p className="text-sm">
                        This removes {plural(daySlots.length, "slot")}
                        {bookedStudents > 0 ? ` and cancels ${plural(bookedStudents, "student booking")}` : ""}.
                    </p>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={saving}
                        onClick={() => (bookedStudents > 0 ? setConfirmOpen(true) : void markUnavailable())}
                        className="h-9"
                    >
                        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                        {saving ? "Saving..." : "Mark unavailable"}
                    </Button>
                </>
            ) : currentStatus === "available" ? (
                <p className="text-sm text-gray-500">Already available: {plural(daySlots.length, "slot")} on this date.</p>
            ) : (
                <p className="text-sm text-gray-500">Already unavailable. Students can&apos;t book this date.</p>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !saving && setConfirmOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mark this date as unavailable?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {plural(daySlots.length, "slot")} on {date ? formatLongDate(date) : "this date"} will be removed.{" "}
                            {plural(bookedStudents, "student booking")} will be cancelled, and the students won&apos;t be notified.
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
                            {saving ? "Removing..." : "Mark unavailable"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
