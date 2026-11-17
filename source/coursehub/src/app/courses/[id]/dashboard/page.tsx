"use client"

import { useParams } from "next/navigation"
import CoursePage from "@/components/overview/course"

export default function InstanceCoursePage() {
    const { id } = useParams<{ id: string }>()

    return (
        <div className="w-full">
            <CoursePage key={id} />
        </div>
    )
}