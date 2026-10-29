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
    dueTasks = [],
}: {
    onSelect?: (dateKey: string) => void
    dueTasks?: { date: string; title: string }[] // date: "YYYY-MM-DD"
}) {
    // task titles grouped by due date
    const dueByDate: Record<string, string[]> = {}
    for (const t of dueTasks) (dueByDate[t.date] ??= []).push(t.title)

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
                    const titles = dueByDate[key] ?? []
                    const dots = Math.min(titles.length, 4)
                    return (
                        <div key={key} className="group relative mx-auto">
                        <button
                            onClick={() => onSelect?.(key)}
                            className={`relative size-14 transition-all hover:scale-125 ${
                                isToday
                                    ? "rounded-xl border-[3px] border-brand font-semibold text-brand"
                                    : "rounded-xl hover:bg-gray-100"
                            }`}
                        >
                            {day}
                            {dots > 0 && (
                                <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                                    {Array.from({ length: dots }, (_, n) => (
                                        <span key={n} className="size-1.5 rounded-full bg-brand" />
                                    ))}
                                </span>
                            )}
                        </button>
                        {titles.length > 0 && (
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-max max-w-56 -translate-x-1/2 flex-col gap-1 rounded-lg bg-brand-ink px-3 py-2 text-left text-sm text-white shadow-lg group-hover:flex">
                                {titles.map((title, n) => (
                                    <span key={n} className="truncate">• {title}</span>
                                ))}
                            </div>
                        )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
