import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validId(value: unknown): value is string | number {
  return (typeof value === "string" || typeof value === "number") && /^\d+$/.test(String(value))
}

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const announcementId = request.nextUrl.searchParams.get("announcement_id")
  if (!courseId || !announcementId || !validId(announcementId)) {
    return NextResponse.json({ detail: "Course ID and announcement ID are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/announcements/${announcementId}/comments/read`,
      { headers: { cookie: cookieStore.toString() }, cache: "no-store" },
    )
    const data = await response.json().catch(() => ({
      detail: "Announcement service returned an invalid response",
    }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the announcement service" }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: "A valid JSON body is required" }, { status: 400 })
  }

  if (
    !isRecord(body) ||
    typeof body.course_id !== "string" ||
    !body.course_id.trim() ||
    !validId(body.announcement_id) ||
    typeof body.comment !== "string" ||
    !body.comment.trim()
  ) {
    return NextResponse.json(
      { detail: "Course ID, announcement ID, and comment are required" },
      { status: 400 },
    )
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/announcements/${String(body.announcement_id)}/comments/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify({ comment: body.comment.trim() }),
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
