import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/announcements/read`,
      {
        headers: { cookie: cookieStore.toString() },
        cache: "no-store",
      },
    )
    const data = await response.json().catch(() => ({
      detail: "Announcement service returned an invalid response",
    }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the announcement service" }, { status: 502 })
  }
}