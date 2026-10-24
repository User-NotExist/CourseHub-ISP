import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "<http://localhost:8000>"

// GET /api_consultation/read?course_id=...            -> all logs of the course
// GET /api_consultation/read?course_id=...&log_id=... -> a single log
export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const logId = request.nextUrl.searchParams.get("log_id")

  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }
  if (logId !== null && !/^\d+$/.test(logId)) {
    return NextResponse.json({ detail: "Log ID must be a number" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const path = logId ? `/read/${logId}` : "/read"
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/consultation_logs${path}`,
      { headers: { cookie: cookieStore.toString() }, cache: "no-store" },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the consultation service" }, { status: 502 })
  }
}