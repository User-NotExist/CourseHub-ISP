"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Pencil, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import {
    ActivityForm,
    errorMessage,
    formatDate,
    loadActivities,
    type Activity,
    type ActivityInput,
    type Course,
} from "@/components/activity_form"

export default function ActivityDetailPage() {
    const params = useParams()
    const router = useRouter()
    const courseId = params.id as string
    const activityId = Number(params.activityId)
    const listUrl = `/courses/${courseId}/acmil`

    const [activity, setActivity] = useState<Activity | null>(null)
    const [course, setCourse] = useState<Course | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [userId, setUserId] = useState<number | null>(null)

    const canEdit = course?.role === "lecturer" || (activity !== null && activity.user_id === userId)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await loadActivities(courseId)
                const found = data.activities.find((a) => a.activity_id === activityId)
                if (!found) throw new Error("Activity not found")
                setActivity(found)
                setCourse(data.course)
                const userRes = await fetch("/api_auth/me")
                if (userRes.ok) {
                    const user: { user_id: number } = await userRes.json()
                    setUserId(user.user_id)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load activity")
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [courseId, activityId])

    const handle_update = async (input: ActivityInput) => {
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
        setActivity(data)
        setIsFormOpen(false)
        toast.success("Activity updated.", { position: "top-right" })
    }

    const handle_delete = async () => {
        setIsDeleting(true)
        try {
            const query = new URLSearchParams({ course_id: courseId, activity_id: String(activityId) })
            const res = await fetch(`/api_activity/delete?${query}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to delete activity"), { position: "top-right" })
                return
            }
            toast.success("Activity deleted.", { position: "top-right" })
            router.push(listUrl)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex flex-col h-screen gap-4 w-full p-10 overflow-y-auto">
            <div className="flex flex-row items-start justify-between gap-6">
                <div className="min-w-0">
                    <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Activities and Milestones Details</h1>
                    <h2 className="mt-2 truncate text-lg font-semibold text-neutral-900">{course?.course_name ?? " "}</h2>
                </div>
                <Button
                    variant="outline"
                    onClick={() => router.push(listUrl)}
                    className="h-auto shrink-0 gap-2 rounded-xl border-brand/30 bg-white px-5 py-3 text-base font-semibold text-brand-ink shadow-sm transition hover:bg-brand hover:text-brand-foreground"
                >
                    <ArrowLeft />
                    Back to activities
                </Button>
            </div>

            <div className="flex flex-col gap-6 rounded-3xl bg-panel p-6 mb-6 text-panel-foreground overflow-y-auto overflow-x-hidden min-w-0 shadow-sm ring-1 ring-panel-border lg:p-8">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin" size={40} />
                    </div>
                ) : error || !activity ? (
                    <p className="py-10 text-center">{error ?? "Activity not found"}</p>
                ) : (
                    <>
                        <div className="flex flex-row items-start justify-between gap-4">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-semibold leading-snug break-words lg:text-3xl">{activity.activity_name}</h3>
                                <div className="flex flex-row gap-2">
                                    <span className="rounded-full bg-panel-surface px-3 py-0.5 text-xs font-semibold text-panel-foreground ring-1 ring-panel-border">
                                        {activity.activity_type}
                                    </span>
                                </div>
                            </div>

                            {canEdit && (
                                <div className="flex flex-row gap-3">
                                    <Button onClick={() => setIsFormOpen(true)} className="h-10 gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover">
                                        <Pencil className="size-4" aria-hidden />
                                        Edit
                                    </Button>
                                    <Button onClick={() => setIsDeleteOpen(true)} className="h-10 gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-destructive/90">
                                        <Trash2Icon className="size-4" aria-hidden />
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl bg-panel-surface p-5">
                                <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Date</p>
                                <p className="mt-3 text-lg font-medium">{formatDate(activity.activity_date)}</p>
                            </div>
                            <div className="rounded-2xl bg-panel-surface p-5">
                                <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Created by</p>
                                <p className="mt-3 text-lg font-medium">{activity.creator_name}</p>
                            </div>
                        </div>

                        <div className="flex flex-col rounded-2xl bg-panel-surface p-5 lg:p-6">
                            <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Description</p>
                            <p className="mt-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-7 text-panel-muted">{activity.activity_description || "—"}</p>
                        </div>
                    </>
                )}
            </div>

            {isFormOpen && activity && (
                <ActivityForm initial={activity} onCancel={() => setIsFormOpen(false)} onSave={handle_update} />
            )}

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                            <Trash2Icon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &quot;{activity?.activity_name}&quot; will be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handle_delete} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}