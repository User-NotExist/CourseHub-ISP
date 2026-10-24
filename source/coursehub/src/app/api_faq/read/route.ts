import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const cookieStore = await cookies()

  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/faqs/read`,
      { headers: { cookie: cookieStore.toString() }, cache: "no-store" },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the FAQ service" }, { status: 502 })
  }
}