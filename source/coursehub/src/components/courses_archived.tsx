"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogMedia
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

import { Trash, Loader2, Trash2Icon, Search, ArchiveRestore } from "lucide-react"

type Course = {
    course_id: string
    course_name: string
    course_description: string
    course_thumbnail: string
    createdAt: string
    can_edit?: boolean
    role: string
}

export default function ArchivedCoursePage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [search, setSearch] = useState("")
    const [restoringId, setRestoringId] = useState<string | null>(null)

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await fetch("/api_course/read_archived")
                if (!res.ok) throw new Error("Failed to fetch archived courses")
                setCourses(await res.json())
            } catch (error) {
                console.error(error)
                setCourses([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchCourses()
    }, [])

    const q = search.trim().toLowerCase()
    const filteredCourses = courses.filter((course) =>
        course.course_name.toLowerCase().includes(q) || (course.course_description ?? "").toLowerCase().includes(q)
    )

    const handle_delete = async () => {
        if (!courseToDelete || isDeleting) return

        const toastId = toast.loading("Deleting course...", { position: "top-right" })
        setIsDeleting(true)
        try {
            const res = await fetch("/api_course/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course_id: courseToDelete }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.detail || "Failed to delete course")
            }

            setCourses((prev) => prev.filter((course) => course.course_id !== courseToDelete))
            toast.success("Course deleted", { id: toastId })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete course", { id: toastId })
        } finally {
            setIsDeleting(false)
            setCourseToDelete(null)
        }
    }

    const handle_restore = async (course_id: string) => {
        if (restoringId) return

        const toastId = toast.loading("Restoring course...", { position: "top-right" })
        setRestoringId(course_id)
        try {
            const res = await fetch("/api_course/set_status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course_id, course_status: "online" }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.detail || "Failed to restore course")
            }

            setCourses((prev) => prev.filter((course) => course.course_id !== course_id))
            toast.success("Course restored", { id: toastId })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to restore course", { id: toastId })
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <div className="flex flex-col justify-top items-center h-screen w-max pt-7 overflow-y-auto scrollbar-none gap-4 xl:w-270 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <h1 className="w-full px-1 text-3xl font-semibold tracking-tight text-brand-ink">Archived Courses</h1>

            <div className="relative w-full px-1 shrink-0">
                <Input
                    placeholder="Search archived courses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2" />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin mt-10" size={45} />
                </div>
            ) : filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 w-full pb-6">
                    {filteredCourses.map((course) => (
                        <div key={course.course_id} className="pb-4 bg-[#C9DFDA] rounded-xl drop-shadow-lg">
                            <Image
                                alt="coursebg"
                                src={course.course_thumbnail}
                                width={400}
                                height={160}
                                className="w-full h-40 object-cover rounded-tr-xl rounded-tl-xl grayscale"
                            />

                            <div className="w-full h-[2px] bg-panel-border rounded-xl mb-3"></div>

                            <h1 className="px-5 text-panel-foreground font-semibold">{course.course_name}</h1>
                            <h2 className="px-5 text-panel-muted text-[13px] h-11">{course.course_description}</h2>

                            <div className="px-5 flex flex-row justify-between items-center mt-4">
                                <div className="flex items-center">
                                    {course.can_edit && (
                                        <Button aria-label={`Delete ${course.course_name}`} onClick={() => setCourseToDelete(course.course_id)}>
                                            <Trash className="text-red-500" />
                                        </Button>
                                    )}
                                </div>

                                {course.can_edit && (
                                    <Button onClick={() => handle_restore(course.course_id)} disabled={restoringId === course.course_id}>
                                        {restoringId === course.course_id ? <Loader2 className="animate-spin" /> : <ArchiveRestore />}
                                        Restore
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <h1 className="flex flex-col items-center justify-center pt-30">
                    {courses.length > 0 ? "No courses match your search" : "No Archived Courses"}
                </h1>
            )}

            <AlertDialog open={!!courseToDelete} onOpenChange={(isOpen) => !isOpen && !isDeleting && setCourseToDelete(null)}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                            <Trash2Icon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
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
