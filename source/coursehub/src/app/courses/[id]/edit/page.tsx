"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const DESCRIPTION_MAX_LENGTH = 70

type Course = {
    course_id: string
    course_name: string
    course_description: string | null
}

export default function EditCoursePage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const courseId = params.id

    const [courseName, setCourseName] = useState("")
    const [courseDescription, setCourseDescription] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const loadCourse = async () => {
            try {
                const response = await fetch("/api_course/read")
                if (!response.ok) throw new Error("Failed to load courses")

                const courses: Course[] = await response.json()
                const course = courses.find((item) => item.course_id === courseId)
                if (!course) throw new Error("Course not found")

                setCourseName(course.course_name)
                setCourseDescription(course.course_description ?? "")
            } catch (error) {
                console.error(error)
                alert("Failed to load course")
                router.push("/courses")
            } finally {
                setIsLoading(false)
            }
        }

        loadCourse()
    }, [courseId, router])

    const handleSave = async () => {
        if (courseName.trim() === "" || courseDescription.trim() === "") {
            alert("All forms must be filled !")
            return
        }

        try {
            setIsSaving(true)
            const response = await fetch("/api_course/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: courseId,
                    course_name: courseName.trim(),
                    course_description: courseDescription.trim(),
                }),
            })

            if (!response.ok) throw new Error("Failed to update course")

            alert("Course updated successfully !")
            router.push("/courses")
        } catch (error) {
            console.error(error)
            alert("Error while updating course")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center">Loading course...</div>
    }

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center px-4">
            <div className="w-full max-w-md">
                <h1 className="mb-6 text-2xl font-bold">Edit Course</h1>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">Course Name</label>
                        <Input
                            value={courseName}
                            onChange={(event) => setCourseName(event.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Description</label>
                        <Textarea
                            value={courseDescription}
                            onChange={(event) => setCourseDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            rows={5}
                        />
                        <p className="mt-1 text-right text-xs text-gray-400">
                            {courseDescription.length}/{DESCRIPTION_MAX_LENGTH}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push("/courses")} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    )
}