"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { Edit, Trash, Loader2 } from "lucide-react"

type Course = {
    course_id: string
    course_unique_for_lecturer: string
    course_unique_for_ta: string
    course_unique_for_student: string
    course_name: string
    course_description: string
    course_thumbnail: string
    createdAt: string
    role: string
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)

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

    const handle_edit = (course_id: string) => {
        alert(`Editing course -> ${course_id}`)
    }

    const handle_delete = async (course_id: string) => {
        try {
            if (!confirm("Are you certain ?")) {
                return
            }

            setIsLoading(true)

            const response = await fetch(`/api_course/delete/${course_id}`, {
                method: "DELETE",
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || "Failed to delete course")
            }

            alert("Course Deleted")

        } catch (error) {
            alert("Error while deleting course")
            console.error(error)
        } finally {
            setIsLoading(false)
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
                                <div className="">
                                    {course.role === "lecturer" && (
                                        <div>
                                            <Button onClick={() => handle_delete(course.course_id)}><Trash className="text-red-500"/></Button>
                                            <Button onClick={() => handle_edit(course.course_id)} className="ml-1"><Edit /></Button>
                                        </div>
                                    )}
                                </div>

                                <Button onClick={() => handle_view(course.course_id)} className="w-25">View</Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <h1 className="flex flex-col items-center justify-center pt-30">No Assigned Courses</h1>
            )}
        </div>
    )
}