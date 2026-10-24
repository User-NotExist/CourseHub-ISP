import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: "A valid JSON body is required" }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { detail: "A course ID and FAQ title are required; description must be text or null" },
      { status: 400 },
    )
  }

  const courseId = body.course_id
  const title = body.title
  const description = body.description
  if (
    typeof courseId !== "string" ||
    !courseId.trim() ||
    typeof title !== "string" ||
    !title.trim() ||
    (description !== undefined && description !== null && typeof description !== "string")
  ) {
    return NextResponse.json(
      { detail: "A course ID and FAQ title are required; description must be text or null" },
      { status: 400 },
    )
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/faqs/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify({
          title: title.trim(),
          description,
        }),
      },
    )
    const data = await response.json().catch(() => ({
      detail: "FAQ service returned an invalid response",
    }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the FAQ service" }, { status: 502 })
  }
}