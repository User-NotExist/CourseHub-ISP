"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

// Shape returned by backend activity.py (ActivityResponse)
type ActivityType = "Activities" | "Milestones"

type Activity = {
    activity_id: number
    user_id: number
    course_id: string
    activity_name: string
    activity_type: ActivityType
    activity_description: string | null
    activity_date: string | null // "YYYY-MM-DD"
    activity_time: string | null
    createdAt: string
}

// Shape returned by /api_course/read (only the fields used here)
type Course = {
    course_id: string
    course_name: string
    role: string
}

const tabs = ["All", "Activities", "Milestones"] as const
type Tab = (typeof tabs)[number]

// "2026-10-10" -> "10/10/2026" (Figma uses DD/MM/YYYY)
function formatDate(date: string | null) {
    if (!date) return "—"
    const [year, month, day] = date.split("-")
    return `${day}/${month}/${year}`
}

const columns = "grid grid-cols-[3fr_2fr_2fr_2fr_2fr] gap-2 px-5"

export default function ActivitiesPage() {
    const params = useParams()
    const courseId = params.id as string

    const [activities, setActivities] = useState<Activity[]>([])
    const [course, setCourse] = useState<Course | null>(null)
    const [tab, setTab] = useState<Tab>("All")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const [activityRes, courseRes] = await Promise.all([
                    fetch(`/api_activity/read?course_id=${encodeURIComponent(courseId)}`),
                    fetch("/api_course/read"),
                ])

                const activityData = await activityRes.json()
                if (!activityRes.ok) throw new Error(activityData.detail || "Failed to load activities")
                setActivities(activityData)

                if (courseRes.ok) {
                    const courses: Course[] = await courseRes.json()
                    setCourse(courses.find((c) => c.course_id === courseId) ?? null)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load activities")
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [courseId])

    const shown = tab === "All" ? activities : activities.filter((a) => a.activity_type === tab)

    return (
        <div className="flex flex-col h-screen pt-7 gap-4 xl:w-250 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <h1 className="text-center text-3xl font-bold text-[#054A46] underline">Activities and Milestones</h1>

            <h2 className="text-xl font-bold">{course?.course_name}</h2>

            <div className="flex flex-row gap-3">
                {tabs.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`rounded-md border border-[#006C67] px-6 py-1 font-bold transition-colors ${
                            tab === t ? "bg-[#006C67] text-white" : "text-[#006C67] hover:bg-[#006C67]/10"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="flex flex-col flex-1 gap-3 rounded-2xl bg-[#054A46] p-4 mb-6 overflow-y-auto">
                <div className={`${columns} rounded-xl bg-[#69928F] py-3 font-bold text-white`}>
                    <span>Title</span>
                    <span>Type</span>
                    <span>Date</span>
                    <span>Assigned</span>
                    <span>Status</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-white" size={40} />
                    </div>
                ) : error ? (
                    <p className="py-10 text-center text-white">{error}</p>
                ) : shown.length === 0 ? (
                    <p className="py-10 text-center text-white/80">No activities or milestones yet.</p>
                ) : (
                    shown.map((activity) => (
                        <div key={activity.activity_id} className={`${columns} items-center rounded-md bg-[#69928F] py-3 text-white`}>
                            <span className="truncate">{activity.activity_name}</span>
                            <span>{activity.activity_type}</span>
                            <span>{formatDate(activity.activity_date)}</span>
                            {/* Not in the API yet - waiting for the team */}
                            <span>—</span>
                            <span>—</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}