import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const courseId = request.nextUrl.searchParams.get("course_id")
    if (!courseId) return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/student/course/${encodeURIComponent(courseId)}/faqs/read`, {
            cache: "no-store",
        })
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the FAQ service !" }, { status: 502 })
    }
}