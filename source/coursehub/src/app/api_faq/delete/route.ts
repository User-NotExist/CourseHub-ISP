import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function DELETE(request: NextRequest) {
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
    (typeof body.faq_id !== "string" && typeof body.faq_id !== "number") ||
    !/^\d+$/.test(String(body.faq_id))
  ) {
    return NextResponse.json({ detail: "A course ID and FAQ ID are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/faqs/delete/${String(body.faq_id)}`,
      {
        method: "DELETE",
        headers: { cookie: cookieStore.toString() },
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