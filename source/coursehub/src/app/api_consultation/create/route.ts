import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "<http://localhost:8000>"

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)
  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !body.course_id ||
    !("title" in body) ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    !("consultant" in body) ||
    typeof body.consultant !== "string" ||
    !body.consultant.trim() ||
    !("consultation_date" in body) ||
    typeof body.consultation_date !== "string" ||
    !body.consultation_date ||
    !("description" in body) ||
    (typeof body.description !== "string" && body.description !== null)
  ) {
    return NextResponse.json(
      { detail: "Valid title, consultant, date, and description are required" },
      { status: 400 },
    )
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/consultation_logs/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: cookieStore.toString() },
        body: JSON.stringify({
          title: body.title,
          consultant: body.consultant,
          consultation_date: body.consultation_date,
          description: body.description,
        }),
      },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the consultation service" }, { status: 502 })
  }
}