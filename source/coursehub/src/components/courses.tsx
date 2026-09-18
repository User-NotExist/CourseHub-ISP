"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

import { Edit, Trash, Loader2, Trash2Icon } from "lucide-react"

type Course = {
    course_id: string
    course_unique_for_lecturer: string
    course_unique_for_ta: string
    course_unique_for_student: string
    course_name: string
    course_description: string
    course_thumbnail: string
    createdAt: string
    can_edit?: boolean
    role: string
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const router = useRouter()

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await fetch("/api_course/read")
                if (!res.ok) throw new Error("Failed to fetch courses")
                const data = await res.json()
                setCourses(data)
            } catch (error) {
                console.error(error)
                setCourses([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchCourses()
    }, [])

    const handle_view = (course_id: string) => {
        router.push(`/courses/${course_id}`)
    }

    const handle_delete = async () => {
        if (!courseToDelete) return

        const toastId = toast.loading("Deleting course...", { position: "top-right" })

        try {
            setIsLoading(true)

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
            setCourseToDelete(null)
        } catch (error) {
            toast.error(`Error while deleting course: ${error}`, { id: toastId })
            console.error(error)
        } finally {
            setIsLoading(false)
            toast.success("Course deleted", { id: toastId })
        }
    }

    return (
        <div className="flex flex-col justify-top items-center h-screen w-max pt-7 overflow-y-auto scrollbar-none gap-4 xl:w-250 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <div className="flex flex-row justiffy-center items-center gap-4 w-full h-35">
                <div className="bg-[#E8E8E8] w-full h-full rounded-xl drop-shadow-md">
                </div>

                <div className="bg-[#E8E8E8] w-full h-full rounded-xl drop-shadow-md">
                </div>
            </div>

            <div className="flex flex-row items-center justify-center w-full gap-4">
                <Input placeholder="Search courses" className="" />
                <Button className="w-25">Search</Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin mt-10" size={45} />
                </div>
            ) : courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 w-full pb-6">
                    {courses.map((course) => (
                        <div key={course.course_id} className="pb-4 bg-[#006C67] rounded-xl drop-shadow-lg">
                            <Image
                                alt="coursebg"
                                src={course.course_thumbnail}
                                width={400}
                                height={160}
                                className="w-full h-40 object-cover rounded-tr-xl rounded-tl-xl"
                            />

                            <div className="w-full h-[2px] bg-[#FFFFFF] rounded-xl mb-3"></div>

                            <h1 className="px-5 text-white">{course.course_name}</h1>
                            <h2 className="px-5 text-white text-[13px] h-11">{course.course_description}</h2>

                            <div className="px-5 flex flex-row justify-between items-center mt-4">
                                <div className="flex items-center">
                                    {course.role === "lecturer" && (
                                        <div>
                                            <Button onClick={() => setCourseToDelete(course.course_id)}><Trash className="text-red-500"/></Button>
                                        </div>
                                    )}
                                    {(course.role === "lecturer" || course.can_edit) && <Button aria-label={`Edit ${course.course_name}`} onClick={() => router.push(`/courses/${course.course_id}/edit`)} className="ml-1"><Edit /></Button>}
                                </div>

                                <Button onClick={() => handle_view(course.course_id)} className="w-25">View</Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <h1 className="flex flex-col items-center justify-center pt-30">No Assigned Courses</h1>
            )}

            <AlertDialog open={!!courseToDelete} onOpenChange={(isOpen) => !isOpen && setCourseToDelete(null)}>
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
                        <AlertDialogCancel variant="outline" disabled={isDeleting} >Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handle_delete} disabled={isDeleting}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}