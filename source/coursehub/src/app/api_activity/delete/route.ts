import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function DELETE(request: NextRequest) {
    const courseId = request.nextUrl.searchParams.get("course_id")
    const activityId = request.nextUrl.searchParams.get("activity_id")
    if (!courseId || !activityId) {
        return NextResponse.json({ detail: "Course ID and activity ID are required" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(
            `${backendUrl}/course/${encodeURIComponent(courseId)}/activities/${encodeURIComponent(activityId)}`,
            {
                method: "DELETE",
                headers: { cookie: (await cookies()).toString() },
            },
        )
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the activity service" }, { status: 502 })
    }
}