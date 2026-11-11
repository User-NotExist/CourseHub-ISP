"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { toDateKey, useTodayKey } from "@/components/calendar/course_calendar"
import { isFull, type AppointmentSlot } from "@/lib/appointments"

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

// bar colour of a slot: red = full, blue = has bookings, grey = nobody booked yet
export const slotColor = (s: AppointmentSlot) =>
    isFull(s) ? "bg-red-500" : s.booked > 0 ? "bg-sky-500" : "bg-gray-300"

// Same look as the Main page calendar, but each bar is an appointment slot instead of a task / activity.
export default function AppointmentCalendar({
    slots,
    selectedDate = null,
    highlightDate = null,
    onSelect,
}: {
    slots: AppointmentSlot[]
    selectedDate?: string | null // date the page is showing details for
    highlightDate?: string | null // date to shade + show popup (from hovering a list item)
    onSelect?: (dateKey: string) => void
}) {
    const slotsByDate: Record<string, AppointmentSlot[]> = {}
    for (const s of slots) (slotsByDate[s.date] ??= []).push(s)

    const today = new Date()
    const todayKey = useTodayKey()

    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())

    const firstWeekDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array.from({ length: firstWeekDay }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    // fill the last week so every row is complete
    while (cells.length % 7 !== 0) cells.push(null)

    const currentYear = today.getFullYear()
    const years = [currentYear - 1, currentYear, currentYear + 1]

    const shiftMonth = (step: number) => {
        const next = new Date(year, month + step, 1)
        setYear(next.getFullYear())
        setMonth(next.getMonth())
    }

    // jump back to the current month and select today
    const goToToday = () => {
        const now = new Date()
        setYear(now.getFullYear())
        setMonth(now.getMonth())
        onSelect?.(toDateKey(now.getFullYear(), now.getMonth(), now.getDate()))
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-2 pb-4">
                <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-1">
                    <ChevronLeft className="size-6" />
                </button>
                <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    aria-label="Month"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-1 text-xl"
                >
                    {monthNames.map((name, i) => (
                        <option key={name} value={i}>{name}</option>
                    ))}
                </select>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    aria-label="Year"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-1 text-xl"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-1">
                    <ChevronRight className="size-6" />
                </button>
                <button
                    onClick={goToToday}
                    className="ml-2 shrink-0 rounded-md border border-gray-300 px-4 py-1 text-xl transition-colors hover:bg-gray-100"
                >
                    Today
                </button>
            </div>

            <div className="grid grid-cols-7 text-center text-lg">
                {weekDays.map((d) => (
                    <span key={d} className="border-b border-gray-200 pb-3 text-lg text-gray-500">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={`empty-${i}`} className="border-b border-gray-200" />
                    const key = toDateKey(year, month, day)
                    const isToday = key === todayKey
                    const isSelected = key === selectedDate
                    const isHighlighted = key === highlightDate
                    const daySlots = slotsByDate[key] ?? []
                    const isPast = todayKey !== "" && key < todayKey
                    // fill the date by availability: green = a slot with seats left, red = every slot full,
                    // grey = past, no fill = unavailable (no slots)
                    const tint =
                        daySlots.length === 0
                            ? ""
                            : isPast
                              ? "bg-gray-200"
                              : daySlots.some((s) => !isFull(s))
                                ? "bg-green-200"
                                : "bg-red-200"
                    return (
                        <div key={key} className="group relative flex justify-center border-b border-gray-200 py-3">
                            <button
                                onClick={() => onSelect?.(key)}
                                className={`peer relative size-14 rounded-xl transition-all hover:scale-125 ${
                                    isToday ? "font-semibold text-brand" : ""
                                } ${tint} ${isSelected ? (tint ? "ring-2 ring-brand" : "bg-brand/10 ring-2 ring-brand") : ""} ${
                                    isHighlighted ? "scale-125" : ""
                                }`}
                            >
                                {isToday && <span className="absolute top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand" />}
                                {day}
                                {daySlots.length > 0 && (
                                    <span className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5">
                                        <span className="flex gap-0.5">
                                            {daySlots.slice(0, 4).map((s) => (
                                                <span key={s.id} className={`h-1.5 w-5 rounded-full ${slotColor(s)}`} />
                                            ))}
                                        </span>
                                    </span>
                                )}
                            </button>
                            {daySlots.length > 0 && (
                                <div className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-0 ${isHighlighted ? "flex" : "hidden"} w-max max-w-64 -translate-x-1/2 flex-col gap-1 rounded-lg bg-brand px-3 py-2 text-left text-sm text-brand-foreground shadow-lg peer-hover:flex`}>
                                    {daySlots.map((s) => (
                                        <span key={s.id} className="flex items-center gap-2 truncate">
                                            <span className={`h-1 w-3 shrink-0 rounded-full ${slotColor(s)}`} />
                                            {s.startTime} - {s.endTime} ({s.booked}/{s.maxBookings})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="flex flex-wrap justify-between gap-x-10 gap-y-3 pt-3 pl-2 text-base font-bold text-gray-500">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <span className="flex items-center gap-2"><span className="h-4 w-5 rounded bg-green-200" /> Available</span>
                    <span className="flex items-center gap-2"><span className="h-4 w-5 rounded bg-red-200" /> Fully booked</span>
                    <span className="flex items-center gap-2"><span className="h-4 w-5 rounded bg-gray-200" /> Past</span>
                    <span className="flex items-center gap-2"><span className="h-4 w-5 rounded border border-gray-300 bg-white" /> Unavailable</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-sky-500" /> Slot with bookings</span>
                    <span className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-red-500" /> Full slot</span>
                    <span className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-full bg-gray-300" /> No bookings yet</span>
                </div>
            </div>
        </div>
    )
}
