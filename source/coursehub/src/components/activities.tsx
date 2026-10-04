"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    ActivityForm,
    canManageActivities,
    errorMessage,
    formatDate,
    loadActivities,
    type Activity,
    type ActivityInput,
    type Course,
} from "@/components/activity_form"

const tabs = ["All", "Activities", "Milestones"] as const
type Tab = (typeof tabs)[number]

const columns = "grid grid-cols-[3fr_2fr_2fr] gap-2 px-5"

export default function ActivitiesPage() {
    const params = useParams()
    const courseId = params.id as string

    const [activities, setActivities] = useState<Activity[]>([])
    const [course, setCourse] = useState<Course | null>(null)
    const [tab, setTab] = useState<Tab>("All")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)

    const canEdit = canManageActivities(course)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await loadActivities(courseId)
                setActivities(data.activities)
                setCourse(data.course)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load activities")
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [courseId])

    const handle_create = async (input: ActivityInput) => {
        const res = await fetch("/api_activity/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ course_id: courseId, ...input }),
        })
        const data = await res.json()
        if (!res.ok) {
            toast.error(errorMessage(data, "Failed to create activity"), { position: "top-right" })
            return
        }
        setActivities((prev) => [...prev, data])
        setIsFormOpen(false)
        toast.success("Activity created.", { position: "top-right" })
    }

    const shown = tab === "All" ? activities : activities.filter((a) => a.activity_type === tab)

    return (
        <div className="flex flex-col h-screen pt-7 gap-4 xl:w-250 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <h1 className="text-center text-3xl font-bold text-[#054A46] underline">Activities and Milestones</h1>

            <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-bold">{course?.course_name}</h2>
                {canEdit && (
                    <Button onClick={() => setIsFormOpen(true)} className="bg-[#006C67] px-5 text-white hover:bg-[#006C67]/90">
                        <Plus />
                        New
                    </Button>
                )}
            </div>

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

            <div className="flex flex-col gap-3 rounded-2xl bg-[#054A46] p-4 mb-6 overflow-y-auto">
                <div className={`${columns} rounded-xl bg-[#69928F] py-3 font-bold text-white`}>
                    <span>Title</span>
                    <span>Type</span>
                    <span>Date</span>
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
                        <Link
                            key={activity.activity_id}
                            href={`/courses/${courseId}/acmil/${activity.activity_id}`}
                            className={`${columns} items-center rounded-md bg-[#69928F] py-3 text-white transition-colors hover:bg-[#7BA3A0]`}
                        >
                            <span className="truncate">{activity.activity_name}</span>
                            <span>{activity.activity_type}</span>
                            <span>{formatDate(activity.activity_date)}</span>
                        </Link>
                    ))
                )}
            </div>

            {isFormOpen && <ActivityForm onCancel={() => setIsFormOpen(false)} onSave={handle_create} />}
        </div>
    )
}