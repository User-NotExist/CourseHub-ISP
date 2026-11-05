import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function PUT(request: NextRequest) {
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
    (typeof body.announcement_id !== "string" && typeof body.announcement_id !== "number") ||
    !/^\d+$/.test(String(body.announcement_id)) ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    (body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string")
  ) {
    return NextResponse.json(
      { detail: "A course ID, announcement ID and title are required; description must be text or null" },
      { status: 400 },
    )
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/announcements/edit/${String(body.announcement_id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify({
          title: body.title.trim(),
          description:
            typeof body.description === "string" ? body.description.trim() || null : null,
        }),
      },
    )
    const data: unknown = await response.json().catch(() => ({
      detail: "Announcement service returned an invalid response",
    }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the announcement service" }, { status: 502 })
  }
}
