import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function PATCH(request: NextRequest) {
    const { course_id, course_status } = await request.json()
    if (!course_id) return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/course/set_course_status/${encodeURIComponent(course_id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", cookie: (await cookies()).toString() },
            body: JSON.stringify({ course_status }),
        })
        const data = await response.json().catch(() => ({}))
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the course service !" }, { status: 502 })
    }
}
