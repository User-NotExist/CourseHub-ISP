import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidId(value: unknown): value is string | number {
  return (typeof value === "string" || typeof value === "number") && /^\d+$/.test(String(value))
}

type CommentContextPayload = Record<string, unknown> & {
  course_id: string
  announcement_id: string | number
}

function isCommentContext(value: unknown): value is CommentContextPayload {
  return (
    isRecord(value) &&
    typeof value.course_id === "string" &&
    !!value.course_id.trim() &&
    isValidId(value.announcement_id)
  )
}

async function readContext(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { error: NextResponse.json({ detail: "A valid JSON body is required" }, { status: 400 }) }
  }

  if (!isCommentContext(body)) {
    return {
      error: NextResponse.json(
        { detail: "Course ID and announcement ID are required" },
        { status: 400 },
      ),
    }
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return { error: NextResponse.json({ detail: "Not authenticated" }, { status: 401 }) }
  }

  return { body, cookieHeader: cookieStore.toString() }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params
  if (!isValidId(commentId)) {
    return NextResponse.json({ detail: "Comment ID must be a number" }, { status: 400 })
  }

  const context = await readContext(request)
  if ("error" in context) return context.error

  const { body, cookieHeader } = context
  if (typeof body.comment !== "string" || !body.comment.trim()) {
    return NextResponse.json({ detail: "Comment is required" }, { status: 400 })
  }

  const courseId = body.course_id
  const announcementId = String(body.announcement_id)
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/announcements/${announcementId}/comments/edit/${commentId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: cookieHeader },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params
  if (!isValidId(commentId)) {
    return NextResponse.json({ detail: "Comment ID must be a number" }, { status: 400 })
  }

  const context = await readContext(request)
  if ("error" in context) return context.error

  const { body, cookieHeader } = context
  const courseId = body.course_id
  const announcementId = String(body.announcement_id)
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/announcements/${announcementId}/comments/delete/${commentId}`,
      { method: "DELETE", headers: { cookie: cookieHeader } },
    )
    const data = await response.json().catch(() => ({
      detail: "Announcement service returned an invalid response",
    }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the announcement service" }, { status: 502 })
  }
}
