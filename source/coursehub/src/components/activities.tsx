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
            <div className="flex flex-row items-start justify-between gap-6">
                <div className="min-w-0">
                    <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Activities and Milestones</h1>
                    <h2 className="mt-2 truncate text-lg font-semibold text-neutral-900">{course?.course_name ?? " "}</h2>
                </div>
                {canEdit && (
                    <Button onClick={() => setIsFormOpen(true)} className="h-auto shrink-0 gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
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
                        className={`rounded-xl border px-6 py-2 font-semibold shadow-sm transition-colors ${
                            tab === t
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-brand/30 bg-white text-brand-ink hover:bg-brand hover:text-brand-foreground"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-3 rounded-3xl bg-panel p-6 mb-6 overflow-y-auto h-screen scrollbar-none shadow-lg ring-1 ring-black/10">
                <div className={`${columns} rounded-2xl bg-panel-surface-strong py-3.5 font-semibold text-panel-foreground`}>
                    <span>Title</span>
                    <span>Type</span>
                    <span>Date</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-panel-foreground" size={40} />
                    </div>
                ) : error ? (
                    <p className="py-10 text-center text-panel-muted">{error}</p>
                ) : shown.length === 0 ? (
                    <p className="py-10 text-center text-panel-muted">No activities or milestones yet.</p>
                ) : (
                    shown.map((activity) => (
                        <Link
                            key={activity.activity_id}
                            href={`/courses/${courseId}/acmil/${activity.activity_id}`}
                            className={`${columns} items-center rounded-2xl bg-panel-surface py-4 text-panel-foreground transition hover:bg-panel-surface-strong`}
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