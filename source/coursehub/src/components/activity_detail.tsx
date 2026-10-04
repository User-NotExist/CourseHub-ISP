"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Trash2Icon } from "lucide-react"
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
    canManageActivities,
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

    const canEdit = canManageActivities(course)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await loadActivities(courseId)
                const found = data.activities.find((a) => a.activity_id === activityId)
                if (!found) throw new Error("Activity not found")
                setActivity(found)
                setCourse(data.course)
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
        <div className="flex flex-col h-screen pt-7 gap-4 xl:w-250 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <Button variant="outline" onClick={() => router.push(listUrl)} className="self-start gap-2 px-4 py-4 text-md">
                <ArrowLeft />
                Back to activities
            </Button>

            <h1 className="text-center text-3xl font-bold text-[#054A46] underline">Activities and Milestones Details</h1>

            <h2 className="text-xl font-bold">{course?.course_name}</h2>

            <div className="flex flex-col gap-5 rounded-2xl bg-[#054A46] p-6 mb-6 text-white overflow-y-auto">
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
                                <h3 className="text-2xl font-bold break-words">{activity.activity_name}</h3>
                                <div className="flex flex-row gap-2">
                                    <span className="rounded-full bg-[#E8E8E8] px-3 py-0.5 text-xs font-bold text-black">
                                        {activity.activity_type}
                                    </span>
                                </div>
                            </div>

                            {canEdit && (
                                <div className="flex flex-row gap-2">
                                    <Button onClick={() => setIsFormOpen(true)} className="bg-[#E8E8E8] px-5 font-bold text-black hover:bg-white">
                                        Edit
                                    </Button>
                                    <Button onClick={() => setIsDeleteOpen(true)} className="bg-red-600 px-5 font-bold text-white hover:bg-red-700">
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-row flex-wrap gap-4">
                            <div className="min-w-48 rounded-xl bg-[#69928F] px-4 py-3">
                                <p className="font-bold">Date</p>
                                <p>{formatDate(activity.activity_date)}</p>
                            </div>
                            <div className="min-w-48 rounded-xl bg-[#69928F] px-4 py-3">
                                <p className="font-bold">Created by</p>
                                <p>{activity.creator_name}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl bg-[#69928F] px-4 py-3">
                            <p className="font-bold">Description</p>
                            <p className="whitespace-pre-wrap">{activity.activity_description || "—"}</p>
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
                        <AlertDialogAction variant="destructive" onClick={handle_delete} disabled={isDeleting}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}