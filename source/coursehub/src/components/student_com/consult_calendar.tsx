"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

export type Availability = "available" | "uncertain" | "unavailable"

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const availabilityStyle: Record<Availability, string> = {
    available: "bg-[#B9F6B0]",
    uncertain: "bg-[#F3F38A]",
    unavailable: "bg-[#F4A3A3]",
}

export function toDateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export default function ConsultCalendar({
    year,
    month,
    selected,
    availability,
    onMonthChange,
    onSelect,
}: {
    year: number
    month: number 
    selected: string
    availability: Record<string, Availability>
    onMonthChange: (year: number, month: number) => void
    onSelect: (dateKey: string) => void
}) {
    const firstWeekDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array.from({ length: firstWeekDay }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    const currentYear = new Date().getFullYear()
    const years = [currentYear - 1, currentYear, currentYear + 1]

    const shiftMonth = (step: number) => {
        const next = new Date(year, month + step, 1)
        onMonthChange(next.getFullYear(), next.getMonth())
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2">
                <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-1">
                    <ChevronLeft className="size-4" />
                </button>
                <select
                    value={month}
                    onChange={(e) => onMonthChange(year, Number(e.target.value))}
                    aria-label="Month"
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                    {monthNames.map((name, i) => (
                        <option key={name} value={i}>{name}</option>
                    ))}
                </select>
                <select
                    value={year}
                    onChange={(e) => onMonthChange(Number(e.target.value), month)}
                    aria-label="Year"
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-1">
                    <ChevronRight className="size-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {weekDays.map((d) => (
                    <span key={d} className="text-xs text-gray-500">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={`empty-${i}`} />
                    const key = toDateKey(year, month, day)
                    const isSelected = key === selected
                    const status = availability[key]
                    return (
                        <button
                            key={key}
                            onClick={() => onSelect(key)}
                            data-date={key}
                            className={`mx-auto size-8 rounded-md transition-colors ${
                                isSelected
                                    ? "bg-[#054a46] text-white"
                                    : status
                                      ? availabilityStyle[status]
                                      : "hover:bg-gray-100"
                            }`}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-[#B9F6B0]" /> Available</span>
                <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-[#F3F38A]" /> Uncertain</span>
                <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-[#F4A3A3]" /> Not available</span>
            </div>
        </div>
    )
}