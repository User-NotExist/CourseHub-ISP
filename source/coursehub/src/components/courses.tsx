"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Edit, Loader2, Search } from "lucide-react"
import UpcomingLate from "@/components/calendar/upcoming_late"

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

type OverviewTask = {
    task_id: number
    task_name: string
    task_due_date: string
    status: string
    course_id: string
    course_name: string
}

type OverviewActivity = {
    activity_id: number
    activity_name: string
    activity_type: string
    activity_date: string
    course_id: string
    course_name: string
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [search, setSearch] = useState("")
    const [overviewTasks, setOverviewTasks] = useState<OverviewTask[]>([])
    const [overviewActivities, setOverviewActivities] = useState<OverviewActivity[]>([])

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

    // Upcoming / late tasks and activities from every course the user is in
    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const res = await fetch("/api_course/get_details/get_all_overview")
                if (!res.ok) throw new Error("Failed to fetch overview")
                const data = await res.json()
                setOverviewTasks(data.tasks ?? [])
                setOverviewActivities(data.activities ?? [])
            } catch (error) {
                console.error(error)
                setOverviewTasks([])
                setOverviewActivities([])
            }
        }

        fetchOverview()
    }, [])

    const q = search.trim().toLowerCase()
    const filteredCourses = courses.filter((course) =>
        course.course_name.toLowerCase().includes(q) || (course.course_description ?? "").toLowerCase().includes(q)
    )

    const handle_view = (course_id: string) => {
        router.push(`/courses/${course_id}/main`)
    }

    return (
        <div className="flex flex-col justify-top items-center h-screen w-max pt-7 overflow-y-auto scrollbar-none gap-4 xl:w-270 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <div className="flex flex-col w-full max-h-70 shrink-0 [&>div]:gap-4 [&>div>div]:bg-[#E8E8E8] [&>div>div]:rounded-xl [&>div>div]:drop-shadow-md [&>div>div]:p-6">
            <UpcomingLate tasks={overviewTasks} activities={overviewActivities} />
            </div>

            <div className="flex w-full gap-6 text-sm text-gray-500 pl-2 shrink-0">
                <span className="flex items-center gap-1.5 font-bold text-lg"><span className="h-1.5 w-5 rounded-full bg-green-500" /> Task</span>
                <span className="flex items-center gap-1.5 font-bold text-lg"><span className="h-1.5 w-5 rounded-full bg-amber-500" /> Activity</span>
                <span className="flex items-center gap-1.5 font-bold text-lg"><span className="h-1.5 w-5 rounded-full bg-violet-500" /> Milestone</span>
            </div>

            <div className="relative w-full px-1 shrink-0">
                <Input
                    placeholder="Search courses..."
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
                                    {(course.role === "lecturer" || course.can_edit) && <Button aria-label={`Edit ${course.course_name}`} onClick={() => router.push(`/courses/${course.course_id}/edit`)} ><Edit /></Button>}
                                </div>

                                <Button onClick={() => handle_view(course.course_id)} className="w-25">View</Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <h1 className="flex flex-col items-center justify-center pt-30">
                    {courses.length > 0 ? "No courses match your search" : "No Assigned Courses"}
                </h1>
            )}

        </div>
    )
}