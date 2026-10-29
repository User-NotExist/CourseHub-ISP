"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function toDateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export default function CourseCalendar({
    onSelect,
}: {
    onSelect?: (dateKey: string) => void
}) {
    const today = new Date()
    const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())

    const firstWeekDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array.from({ length: firstWeekDay }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    const currentYear = today.getFullYear()
    const years = [currentYear - 1, currentYear, currentYear + 1]

    const shiftMonth = (step: number) => {
        const next = new Date(year, month + step, 1)
        setYear(next.getFullYear())
        setMonth(next.getMonth())
    }


    return (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6">
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
            </div>

            <div className="grid grid-cols-7 gap-8 text-center text-lg">
                {weekDays.map((d) => (
                    <span key={d} className="text-lg text-gray-500">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={`empty-${i}`} />
                    const key = toDateKey(year, month, day)
                    const isToday = key === todayKey
                    return (
                        <button
                            key={key}
                            onClick={() => onSelect?.(key)}
                            className={`mx-auto size-14 transition-all hover:scale-125 ${
                                isToday
                                    ? "rounded-xl border-[3px] border-brand font-semibold text-brand"
                                    : "rounded-xl hover:bg-gray-100"
                            }`}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
