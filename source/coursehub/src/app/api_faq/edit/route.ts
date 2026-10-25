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

  const invalid = NextResponse.json(
    { detail: "A course ID, FAQ ID and FAQ title are required; description must be text or null" },
    { status: 400 },
  )
  if (!isRecord(body)) return invalid

  const courseId = body.course_id
  const faqId = body.faq_id
  const title = body.title
  const description = body.description
  if (
    typeof courseId !== "string" ||
    !courseId.trim() ||
    (typeof faqId !== "string" && typeof faqId !== "number") ||
    !/^\d+$/.test(String(faqId)) ||
    typeof title !== "string" ||
    !title.trim() ||
    (description !== undefined && description !== null && typeof description !== "string")
  ) {
    return invalid
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/faqs/edit/${String(faqId)}`,
      {
        method: "PUT",
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