import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
    const courseId = request.nextUrl.searchParams.get("course_id")
    if (!courseId) return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/course/${encodeURIComponent(courseId)}/activities`, {
            headers: { cookie: (await cookies()).toString() },
            cache: "no-store",
        })
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the activity service" }, { status: 502 })
    }
}