import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
    const courseId = request.nextUrl.searchParams.get("course_id")
    if (!courseId) return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/course/edit/${encodeURIComponent(courseId)}`, {
            headers: { cookie: (await cookies()).toString() },
            cache: "no-store",
        })
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the course service" }, { status: 502 })
    }
}

export async function PUT(request: NextRequest) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

    const body = await request.json()

    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    try {
        const response = await fetch(`${backendUrl}/course/edit`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                cookie: cookieHeader,
            },
            body: JSON.stringify(body),
        })
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the course service" }, { status: 502 })
    }
}
