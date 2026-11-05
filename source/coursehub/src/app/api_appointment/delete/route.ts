import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

// Mark a date as unavailable = delete its appointment slot (lecturer or TA).
// WARNING: the backend also deletes every student booking on that slot.
// DELETE /api_appointment/delete  body: { course_id, slot_id }
export async function DELETE(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)

  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !body.course_id ||
    !("slot_id" in body) ||
    typeof body.slot_id !== "number" ||
    !Number.isInteger(body.slot_id)
  ) {
    return NextResponse.json({ detail: "Course ID and slot ID are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/appointments/avaliable/delete/${body.slot_id}`,
      { method: "DELETE", headers: { cookie: cookieStore.toString() } },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the appointment service" }, { status: 502 })
  }
}
