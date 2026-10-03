"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams } from "next/navigation"
import { Edit, Loader2, Plus, Trash, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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

// Fields the form sends to the API (activity.py ActivityCreate / ActivityEdit)
type ActivityInput = {
    activity_name: string
    activity_type: ActivityType
    activity_description: string | null
    activity_date: string | null
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

// FastAPI returns "detail" as a string, or as a list of field errors (422)
function errorMessage(data: { detail?: unknown }, fallback: string) {
    if (typeof data.detail === "string") return data.detail
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return String(data.detail[0].msg)
    return fallback
}

// Create / edit form (Figma: Title / Type / Date / Assigned / Detail + Cancel / Save)
// When "initial" is given, the form opens with that activity's data (edit mode).
function ActivityForm({
    initial,
    onCancel,
    onSave,
}: {
    initial?: Activity
    onCancel: () => void
    onSave: (input: ActivityInput) => Promise<void>
}) {
    const [name, setName] = useState(initial?.activity_name ?? "")
    const [type, setType] = useState<ActivityType | "">(initial?.activity_type ?? "")
    const [date, setDate] = useState(initial?.activity_date ?? "")
    const [description, setDescription] = useState(initial?.activity_description ?? "")
    const [isSaving, setIsSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handle_submit = async (event: FormEvent) => {
        event.preventDefault()
        if (!name.trim()) return setFormError("Title is required")
        if (!type) return setFormError("Type is required")

        setFormError(null)
        setIsSaving(true)
        try {
            await onSave({
                activity_name: name.trim(),
                activity_type: type,
                activity_description: description.trim() || null,
                activity_date: date || null,
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
            <form
                onSubmit={handle_submit}
                onClick={(event) => event.stopPropagation()}
                className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-[#E8F1F0] p-6"
            >
                <label className="flex flex-col gap-1 font-bold">
                    Title
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter Activities or Milestones Title"
                        className="bg-white font-normal"
                    />
                </label>

                <div className="grid grid-cols-3 gap-4">
                    <label className="flex flex-col gap-1 font-bold">
                        Type
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value as ActivityType | "")}
                            className="h-8 rounded-lg border border-input bg-white px-2 font-normal"
                        >
                            <option value="">Select type</option>
                            <option value="Activities">Activities</option>
                            <option value="Milestones">Milestones</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1 font-bold">
                        Date
                        <Input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className="bg-white font-normal"
                        />
                    </label>

                    {/* Assigned: in Figma but not in the API yet - waiting for the team */}
                    <label className="flex flex-col gap-1 font-bold text-black/40">
                        Assigned
                        <Input disabled placeholder="Not available yet" className="bg-white font-normal" />
                    </label>
                </div>

                <label className="flex flex-col gap-1 font-bold">
                    Detail
                    <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Write consultation notes, questions, and next steps..."
                        className="min-h-32 bg-white font-normal"
                    />
                </label>

                {formError && <p className="text-sm font-bold text-red-600">{formError}</p>}

                <div className="flex flex-row gap-3">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving} className="bg-[#054A46] text-white hover:bg-[#054A46]/90">
                        {isSaving && <Loader2 className="animate-spin" />}
                        Save
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default function ActivitiesPage() {
    const params = useParams()
    const courseId = params.id as string

    const [activities, setActivities] = useState<Activity[]>([])
    const [course, setCourse] = useState<Course | null>(null)
    const [tab, setTab] = useState<Tab>("All")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // null = form closed, "new" = create, Activity = edit that activity
    const [formTarget, setFormTarget] = useState<Activity | "new" | null>(null)
    const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Figma: only lecturers can create / edit / delete
    const canEdit = course?.role === "lecturer"
    // Extra column for the edit / delete icons (lecturer only)
    const columns = `grid ${canEdit ? "grid-cols-[3fr_2fr_2fr_2fr_2fr_80px]" : "grid-cols-[3fr_2fr_2fr_2fr_2fr]"} gap-2 px-5`

    useEffect(() => {
        const load = async () => {
            try {
                const [activityRes, courseRes] = await Promise.all([
                    fetch(`/api_activity/read?course_id=${encodeURIComponent(courseId)}`),
                    fetch("/api_course/read"),
                ])

                const activityData = await activityRes.json()
                if (!activityRes.ok) throw new Error(errorMessage(activityData, "Failed to load activities"))
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
        setFormTarget(null)
        toast.success("Activity created.", { position: "top-right" })
    }

    const handle_update = async (activityId: number, input: ActivityInput) => {
        const res = await fetch("/api_activity/edit", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ course_id: courseId, activity_id: activityId, ...input }),
        })
        const data = await res.json()
        if (!res.ok) {
            toast.error(errorMessage(data, "Failed to update activity"), { position: "top-right" })
            return
        }
        setActivities((prev) => prev.map((a) => (a.activity_id === activityId ? data : a)))
        setFormTarget(null)
        toast.success("Activity updated.", { position: "top-right" })
    }

    const handle_delete = async () => {
        if (!activityToDelete) return
        setIsDeleting(true)
        try {
            const query = new URLSearchParams({
                course_id: courseId,
                activity_id: String(activityToDelete.activity_id),
            })
            const res = await fetch(`/api_activity/delete?${query}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to delete activity"), { position: "top-right" })
                return
            }
            setActivities((prev) => prev.filter((a) => a.activity_id !== activityToDelete.activity_id))
            setActivityToDelete(null)
            toast.success("Activity deleted.", { position: "top-right" })
        } finally {
            setIsDeleting(false)
        }
    }

    const shown = tab === "All" ? activities : activities.filter((a) => a.activity_type === tab)

    return (
        <div className="flex flex-col h-screen pt-7 gap-4 xl:w-250 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <h1 className="text-center text-3xl font-bold text-[#054A46] underline">Activities and Milestones</h1>

            <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-bold">{course?.course_name}</h2>
                {canEdit && (
                    <Button onClick={() => setFormTarget("new")} className="bg-[#006C67] px-5 text-white hover:bg-[#006C67]/90">
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

            <div className="flex flex-col flex-1 gap-3 rounded-2xl bg-[#054A46] p-4 mb-6 overflow-y-auto">
                <div className={`${columns} rounded-xl bg-[#69928F] py-3 font-bold text-white`}>
                    <span>Title</span>
                    <span>Type</span>
                    <span>Date</span>
                    <span>Assigned</span>
                    <span>Status</span>
                    {canEdit && <span />}
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
                            {canEdit && (
                                <span className="flex justify-end gap-1">
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`Edit ${activity.activity_name}`}
                                        onClick={() => setFormTarget(activity)}
                                        className="text-white hover:bg-white/20 hover:text-white"
                                    >
                                        <Edit />
                                    </Button>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`Delete ${activity.activity_name}`}
                                        onClick={() => setActivityToDelete(activity)}
                                        className="text-red-300 hover:bg-white/20 hover:text-red-200"
                                    >
                                        <Trash />
                                    </Button>
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {formTarget && (
                <ActivityForm
                    key={formTarget === "new" ? "new" : formTarget.activity_id}
                    initial={formTarget === "new" ? undefined : formTarget}
                    onCancel={() => setFormTarget(null)}
                    onSave={(input) =>
                        formTarget === "new" ? handle_create(input) : handle_update(formTarget.activity_id, input)
                    }
                />
            )}

            {/* Same confirmation style as deleting a course (courses.tsx) */}
            <AlertDialog open={!!activityToDelete} onOpenChange={(isOpen) => !isOpen && setActivityToDelete(null)}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                            <Trash2Icon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &quot;{activityToDelete?.activity_name}&quot; will be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handle_delete} disabled={isDeleting}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}