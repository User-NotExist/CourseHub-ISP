import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"


export async function PUT(request: NextRequest) {
    const { course_id, activity_id, ...activity } = await request.json()
    if (!course_id || !activity_id) {
        return NextResponse.json({ detail: "Course ID and activity ID are required" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(
            `${backendUrl}/course/${encodeURIComponent(course_id)}/activities/${encodeURIComponent(activity_id)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    cookie: (await cookies()).toString(),
                },
                body: JSON.stringify(activity),
            },
        )
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the activity service" }, { status: 502 })
    }
}