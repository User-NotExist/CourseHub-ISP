"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { toDateKey, useTodayKey } from "@/components/calendar/course_calendar"
import { cn } from "@/lib/utils"

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

// "YYYY-MM-DD" -> "11 Nov 2026" (parsed by hand so the time zone can't shift the day)
function formatKey(key: string) {
    const [y, m, d] = key.split("-").map(Number)
    if (!y || !m || !d) return ""
    return `${d} ${monthNames[m - 1].slice(0, 3)} ${y}`
}

// A date field with its own calendar popup. Unlike <input type="date">, the picker is drawn by us,
// so there is no browser "Clear" button: a date can be changed but never emptied.
export function DatePicker({
    id,
    value,
    onChange,
    min,
    disabled,
    className,
}: {
    id?: string
    value: string // "YYYY-MM-DD"
    onChange: (dateKey: string) => void
    min?: string // earlier dates are greyed out and can't be picked
    disabled?: boolean
    className?: string
}) {
    const todayKey = useTodayKey()
    const [open, setOpen] = React.useState(false)

    // month being looked at; jumps back to the selected date's month each time the popup opens
    const anchor = value || todayKey
    const [view, setView] = React.useState(() => {
        const [y, m] = (anchor || toDateKey(new Date().getFullYear(), new Date().getMonth(), 1)).split("-").map(Number)
        return { year: y, month: m - 1 }
    })

    const handleOpenChange = (next: boolean) => {
        if (next && anchor) {
            const [y, m] = anchor.split("-").map(Number)
            setView({ year: y, month: m - 1 })
        }
        setOpen(next)
    }

    const shiftMonth = (step: number) => {
        const next = new Date(view.year, view.month + step, 1)
        setView({ year: next.getFullYear(), month: next.getMonth() })
    }

    const firstWeekDay = new Date(view.year, view.month, 1).getDay()
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array.from({ length: firstWeekDay }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
            <PopoverPrimitive.Trigger
                id={id}
                disabled={disabled}
                className={cn(
                    "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-white px-2.5 py-1 text-left text-base font-normal transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    className,
                )}
            >
                <span className="truncate">{formatKey(value) || "Pick a date"}</span>
                <CalendarIcon className="size-4 shrink-0 text-gray-500" aria-hidden />
            </PopoverPrimitive.Trigger>

            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
                    <PopoverPrimitive.Popup className="w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg outline-none">
                        <div className="flex items-center justify-between pb-2">
                            <button
                                type="button"
                                onClick={() => shiftMonth(-1)}
                                aria-label="Previous month"
                                className="rounded-md p-1 hover:bg-gray-100"
                            >
                                <ChevronLeft className="size-5" />
                            </button>
                            <span className="text-sm font-semibold" aria-live="polite">
                                {monthNames[view.month]} {view.year}
                            </span>
                            <button
                                type="button"
                                onClick={() => shiftMonth(1)}
                                aria-label="Next month"
                                className="rounded-md p-1 hover:bg-gray-100"
                            >
                                <ChevronRight className="size-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                            {weekDays.map((d) => (
                                <span key={d} className="pb-1 text-xs text-gray-500">{d}</span>
                            ))}
                            {cells.map((day, i) => {
                                if (day === null) return <span key={`empty-${i}`} />
                                const key = toDateKey(view.year, view.month, day)
                                const isSelected = key === value
                                const isToday = key === todayKey
                                const isDisabled = !!min && key < min
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        disabled={isDisabled}
                                        aria-pressed={isSelected}
                                        onClick={() => {
                                            onChange(key)
                                            setOpen(false)
                                        }}
                                        className={cn(
                                            "mx-auto size-9 rounded-lg transition-colors",
                                            isSelected
                                                ? "bg-brand font-semibold text-brand-foreground"
                                                : "hover:bg-gray-100",
                                            isToday && !isSelected && "font-semibold text-brand ring-1 ring-brand",
                                            isDisabled && "cursor-not-allowed text-gray-300 hover:bg-transparent",
                                        )}
                                    >
                                        {day}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                disabled={!todayKey || (!!min && todayKey < min)}
                                onClick={() => {
                                    onChange(todayKey)
                                    setOpen(false)
                                }}
                                className="rounded-md border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                                Today
                            </button>
                        </div>
                    </PopoverPrimitive.Popup>
                </PopoverPrimitive.Positioner>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    )
}
