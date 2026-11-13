"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import CourseCalendar, { useTodayKey } from "@/components/calendar/course_calendar"

type Assignee = { task_assignee_gmail: string; status: string }

type AgendaTask = {
    task_id: number
    task_name: string
    task_description: string | null
    task_due_date: string
    course_id: string
    course_name: string
    my_status: string | null
    assignees: Assignee[]
}

type AgendaActivity = {
    activity_id: number
    activity_name: string
    activity_type: string // "Activities" | "Milestones"
    activity_description: string | null
    activity_date: string
    activity_time: string | null
    course_id: string
    course_name: string
}

// a consultation slot at least one student has booked
type AgendaConsultation = {
    available_id: number
    available_date: string
    start_time: string // "HH:MM"
    end_time: string
    booked: number
    max_bookings: number
    course_id: string
    course_name: string
}

type AgendaData = {
    is_admin: boolean
    tasks: AgendaTask[]
    activities: AgendaActivity[]
    consultations: AgendaConsultation[]
}

const statusColor: Record<string, string> = {
    "To-Do": "text-gray-500",
    "In-Progress": "text-amber-600",
    Done: "text-green-600",
}

function formatDate(date: string) {
    const [y, m, d] = date.split("-")
    return `${d}/${m}/${y}`
}

export default function Agenda() {
    const router = useRouter()
    const todayKey = useTodayKey()

    const [data, setData] = useState<AgendaData>({ is_admin: false, tasks: [], activities: [], consultations: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pickedDate, setPickedDate] = useState<string | null>(null)

    useEffect(() => {
        const fetchAgenda = async () => {
            try {
                const res = await fetch("/api_course/get_details/get_agenda")
                if (!res.ok) throw new Error("Failed to fetch agenda")
                const json = await res.json()
                setData({
                    is_admin: Boolean(json.is_admin),
                    tasks: json.tasks ?? [],
                    activities: json.activities ?? [],
                    consultations: json.consultations ?? [],
                })
            } catch (err) {
                console.error(err)
                setError("Unable to load your agenda.")
            } finally {
                setIsLoading(false)
            }
        }

        fetchAgenda()
    }, [])

    // until the user clicks a day, show today
    const selectedDate = pickedDate ?? todayKey

    const dayTasks = data.tasks.filter((t) => t.task_due_date === selectedDate)
    const dayActivities = data.activities
        .filter((a) => a.activity_date === selectedDate)
        .sort((a, b) => (a.activity_time ?? "").localeCompare(b.activity_time ?? ""))

<<<<<<< Updated upstream:source/coursehub/src/components/overview/agenda.tsx
    const openCourse = (course_id: string) => router.push(`/courses/${course_id}/dashboard`)
=======
    const dayConsultations = data.consultations
        .filter((c) => c.available_date === selectedDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))

    const openCourse = (course_id: string) => router.push(`/courses/${course_id}/main`)
>>>>>>> Stashed changes:source/coursehub/src/components/agenda.tsx

    return (
        <div className="flex flex-col h-screen w-max pt-7 pb-6 overflow-y-auto scrollbar-none gap-4 xl:w-270 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <div className="flex items-end justify-between shrink-0 px-1">
                <h1 className="text-3xl font-bold">Agenda</h1>
                {data.is_admin && (
                    <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-brand-foreground">
                        Admin view: all courses
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin mt-10" size={45} />
                </div>
            ) : error ? (
                <p className="py-10 text-center text-red-600">{error}</p>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[3fr_2fr] shrink-0">
                    <CourseCalendar
                        onSelect={setPickedDate}
                        highlightDate={pickedDate}
                        dueTasks={data.tasks.map((t) => ({ date: t.task_due_date, title: t.task_name }))}
                        activities={data.activities.map((a) => ({
                            date: a.activity_date,
                            title: a.activity_name,
                            type: a.activity_type,
                        }))}
                        consultations={data.consultations.map((c) => ({
                            date: c.available_date,
                            title: `Consultation ${c.start_time}-${c.end_time}`,
                        }))}
                    />

                    <div className="flex flex-col gap-3 rounded-xl bg-[#E8E8E8] p-6 drop-shadow-md">
                        <h2 className="text-lg font-bold">
                            {selectedDate ? formatDate(selectedDate) : ""}
                        </h2>

                        {dayTasks.length === 0 && dayActivities.length === 0 && dayConsultations.length === 0 ? (
                            <p className="py-6 text-center text-sm text-gray-500">Nothing on this day.</p>
                        ) : (
                            <div className="flex flex-col gap-2 overflow-y-auto scrollbar-none">
                                {dayActivities.map((a) => (
                                    <button
                                        key={`a${a.activity_id}`}
                                        onClick={() => openCourse(a.course_id)}
                                        className="flex flex-col gap-1 rounded-lg bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={`h-1.5 w-5 shrink-0 rounded-full ${a.activity_type === "Milestones" ? "bg-violet-500" : "bg-amber-500"}`} />
                                            <span className="flex-1 truncate font-medium">{a.activity_name}</span>
                                            {a.activity_time && <span className="text-sm text-gray-500">{a.activity_time}</span>}
                                        </span>
                                        <span className="pl-8 text-sm text-gray-500 truncate">
                                            {a.activity_type === "Milestones" ? "Milestone" : "Activity"} · {a.course_name}
                                        </span>
                                    </button>
                                ))}

                                {dayConsultations.map((c) => (
                                    <button
                                        key={`c${c.available_id}`}
                                        onClick={() => router.push(`/courses/${c.course_id}/consultation/appointments`)}
                                        className="flex flex-col gap-1 rounded-lg bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="h-1.5 w-5 shrink-0 rounded-full bg-sky-500" />
                                            <span className="flex-1 truncate font-medium">Consultation</span>
                                            <span className="text-sm text-gray-500">{c.start_time}-{c.end_time}</span>
                                        </span>
                                        <span className="pl-8 text-sm text-gray-500 truncate">Consultation · {c.course_name}</span>
                                        <span className="pl-8 text-xs text-gray-500">{c.booked}/{c.max_bookings} booked</span>
                                    </button>
                                ))}

                                {dayTasks.map((t) => (
                                    <button
                                        key={`t${t.task_id}`}
                                        onClick={() => openCourse(t.course_id)}
                                        className="flex flex-col gap-1 rounded-lg bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="h-1.5 w-5 shrink-0 rounded-full bg-green-500" />
                                            <span className="flex-1 truncate font-medium">{t.task_name}</span>
                                            {t.my_status && (
                                                <span className={`text-sm font-semibold ${statusColor[t.my_status] ?? "text-gray-500"}`}>
                                                    {t.my_status}
                                                </span>
                                            )}
                                        </span>
                                        <span className="pl-8 text-sm text-gray-500 truncate">Task · {t.course_name}</span>
                                        {data.is_admin && t.assignees.length > 0 && (
                                            <span className="flex flex-col pl-8 text-xs text-gray-500">
                                                {t.assignees.map((as) => (
                                                    <span key={as.task_assignee_gmail} className="flex justify-between gap-2">
                                                        <span className="truncate">{as.task_assignee_gmail}</span>
                                                        <span className={statusColor[as.status] ?? ""}>{as.status}</span>
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
