// PUBLIC ROUTE (NO LOGIN)

import { NextRequest, NextResponse } from "next/server"
import { clientIpHeader } from "@/lib/client_ip"

export async function GET(request: NextRequest) {
    const courseId = request.nextUrl.searchParams.get("course_id")
    if (!courseId) return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/course/get_name/${encodeURIComponent(courseId)}`, {
            headers: clientIpHeader(request),
            cache: "no-store",
        })
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the course service !" }, { status: 502 })
    }
}
