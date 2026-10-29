"use client"

import { useTodayKey } from "@/components/calendar/course_calendar"

type Task = { task_id: number; task_name: string; task_due_date: string; status?: string }
type Activity = { activity_id: number; activity_name: string; activity_type: string; activity_date: string }

type Item = { id: string; title: string; date: string; kind: "Task" | "Activity" | "Milestone" }

const kindColor: Record<Item["kind"], string> = {
    Task: "bg-green-500",
    Activity: "bg-amber-500",
    Milestone: "bg-violet-500",
}

const DAY_MS = 24 * 60 * 60 * 1000

// whole days from today to a "YYYY-MM-DD" date (negative = past)
function daysFromToday(date: string, todayKey: string) {
    const toUTC = (key: string) => {
        const [y, m, d] = key.split("-").map(Number)
        return Date.UTC(y, m - 1, d)
    }
    return Math.round((toUTC(date) - toUTC(todayKey)) / DAY_MS)
}

function formatDate(date: string) {
    const [y, m, d] = date.split("-")
    return `${d}/${m}/${y}`
}

function isValidDate(date: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

function Row({
    item, note, noteClass, onHover,
}: { item: Item; note: string; noteClass: string; onHover?: (date: string | null) => void }) {
    return (
        <div
            onMouseEnter={() => onHover?.(item.date)}
            onMouseLeave={() => onHover?.(null)}
            className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-shadow hover:shadow-md"
        >
            <span className={`h-1.5 w-5 shrink-0 rounded-full ${kindColor[item.kind]}`} />
            <span className="flex-1 truncate font-medium">{item.title}</span>
            <span className="text-sm text-gray-500">{formatDate(item.date)}</span>
            <span className={`w-24 text-right text-sm font-semibold ${noteClass}`}>{note}</span>
        </div>
    )
}

export default function UpcomingLate({
    tasks, activities, onHoverDate,
}: {
    tasks: Task[]
    activities: Activity[]
    onHoverDate?: (date: string | null) => void // tells the calendar which date to highlight
}) {
    const todayKey = useTodayKey()

    // on the server todayKey is "", so show nothing until the browser knows today
    const openTasks = todayKey ? tasks.filter((t) => isValidDate(t.task_due_date) && t.status !== "Done") : []

    const upcoming: Item[] = [
        ...openTasks.map((t) => ({ id: `t${t.task_id}`, title: t.task_name, date: t.task_due_date, kind: "Task" as const })),
        ...activities
            .filter((a) => isValidDate(a.activity_date))
            .map((a) => ({
                id: `a${a.activity_id}`,
                title: a.activity_name,
                date: a.activity_date,
                kind: a.activity_type === "Milestones" ? ("Milestone" as const) : ("Activity" as const),
            })),
    ]
        .filter((it) => {
            const d = daysFromToday(it.date, todayKey)
            return d >= 0 && d <= 7
        })
        .sort((a, b) => a.date.localeCompare(b.date))

    const late: Item[] = openTasks
        .filter((t) => t.task_due_date < todayKey)
        .map((t) => ({ id: `t${t.task_id}`, title: t.task_name, date: t.task_due_date, kind: "Task" as const }))
        .sort((a, b) => a.date.localeCompare(b.date))

    const upcomingNote = (date: string) => {
        const d = daysFromToday(date, todayKey)
        return d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`
    }
    const lateNote = (date: string) => {
        const d = -daysFromToday(date, todayKey)
        return d === 1 ? "1 day late" : `${d} days late`
    }

    return (
        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-2">
            <div className="flex min-h-0 flex-col gap-3">
                <h3 className="text-lg font-bold">Upcoming</h3>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none">
                    {upcoming.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">None...</p>
                    ) : (
                        upcoming.map((it) => (
                            <Row key={it.id} item={it} note={upcomingNote(it.date)} noteClass="text-brand" onHover={onHoverDate} />
                        ))
                    )}
                </div>
            </div>

            <div className="flex min-h-0 flex-col gap-3">
                <h3 className="text-lg font-bold text-red-600">Late Tasks</h3>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none">
                    {late.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">No late tasks.</p>
                    ) : (
                        late.map((it) => (
                            <Row key={it.id} item={it} note={lateNote(it.date)} noteClass="text-red-600" onHover={onHoverDate} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
