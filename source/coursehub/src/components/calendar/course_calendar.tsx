"use client"

import { useState, useSyncExternalStore } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function toDateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// today's "YYYY-MM-DD" from the browser only ("" on the server),
// so server (UTC) and browser (local time) never disagree during hydration
const noSubscribe = () => () => {}
export function useTodayKey() {
    return useSyncExternalStore(
        noSubscribe,
        () => {
            const d = new Date()
            return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
        },
        () => "",
    )
}

export default function CourseCalendar({
    onSelect,
    dueTasks = [],
    activities = [],
}: {
    onSelect?: (dateKey: string) => void
    dueTasks?: { date: string; title: string }[] // date: "YYYY-MM-DD"
    activities?: { date: string; title: string; type: string }[] // type: "Activities" | "Milestones"
}) {
    // titles grouped by date
    const groupByDate = <T extends { date: string }>(items: T[]) => {
        const map: Record<string, T[]> = {}
        for (const it of items) (map[it.date] ??= []).push(it)
        return map
    }
    const tasksByDate = groupByDate(dueTasks)
    const activitiesByDate = groupByDate(activities)
    const activityColor = (type: string) => (type === "Milestones" ? "bg-violet-500" : "bg-amber-500")

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
            </div>

            <div className="grid grid-cols-7 text-center text-lg">
                {weekDays.map((d) => (
                    <span key={d} className="border-b border-gray-200 pb-3 text-lg text-gray-500">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={`empty-${i}`} className="border-b border-gray-200" />
                    const key = toDateKey(year, month, day)
                    const isToday = key === todayKey
                    const dayTasks = tasksByDate[key] ?? []
                    const dayActivities = activitiesByDate[key] ?? []
                    const taskLines = Math.min(dayTasks.length, 4)
                    return (
                        <div key={key} className="group relative flex justify-center border-b border-gray-200 py-3">
                        <button
                            onClick={() => onSelect?.(key)}
                            className={`relative size-14 transition-all hover:scale-125 ${
                                isToday
                                    ? "rounded-xl font-semibold text-brand"
                                    : "rounded-xl"
                            }`}
                        >
                            {isToday && <span className="absolute top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand" />}
                            {day}
                            <span className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5">
                                {taskLines > 0 && (
                                    <span className="flex gap-0.5">
                                        {Array.from({ length: taskLines }, (_, n) => (
                                            <span key={n} className="h-1.5 w-5 rounded-full bg-green-500" />
                                        ))}
                                    </span>
                                )}
                                {dayActivities.length > 0 && (
                                    <span className="flex gap-0.5">
                                        {dayActivities.slice(0, 4).map((a, n) => (
                                            <span key={n} className={`h-1.5 w-5 rounded-full ${activityColor(a.type)}`} />
                                        ))}
                                    </span>
                                )}
                            </span>
                        </button>
                        {(dayTasks.length > 0 || dayActivities.length > 0) && (
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-0 hidden w-max max-w-56 -translate-x-1/2 flex-col gap-1 rounded-lg bg-brand px-3 py-2 text-left text-sm text-brand-foreground shadow-lg group-hover:flex">
                                {dayTasks.map((t, n) => (
                                    <span key={`t${n}`} className="flex items-center gap-2 truncate">
                                        <span className="h-1 w-3 shrink-0 rounded-full bg-green-400" />{t.title}
                                    </span>
                                ))}
                                {dayActivities.map((a, n) => (
                                    <span key={`a${n}`} className="flex items-center gap-2 truncate">
                                        <span className={`h-1 w-3 shrink-0 rounded-full ${activityColor(a.type)}`} />{a.title}
                                    </span>
                                ))}
                            </div>
                        )}
                        </div>
                    )
                })}
            </div>

            <div className="flex gap-6 text-sm text-gray-500 pt-3 pl-2">
                <span className="flex items-center gap-1.5 font-bold text-lg"><span className="h-1.5 w-5 rounded-full bg-green-500 font-bold" /> Task</span>
                <span className="flex items-center gap-1.5 font-bold text-lg"><span className="h-1.5 w-5 rounded-full bg-amber-500 font-bold" /> Activity</span>
                <span className="flex items-center gap-1.5 font-bold text-lg"><span className="h-1.5 w-5 rounded-full bg-violet-500 font-bold" /> Milestone</span>
            </div>
        </div>
    )
}
