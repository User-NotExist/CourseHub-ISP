import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

// Mark a date as available = create an appointment slot (lecturer or TA).
// POST /api_appointment/create  body: { course_id, appointment_head, available_date, start_time, end_time, notes, max_bookings }
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)

  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !body.course_id ||
    !("appointment_head" in body) ||
    typeof body.appointment_head !== "object" ||
    body.appointment_head === null ||
    !("lecturer" in body.appointment_head) ||
    !isStringList(body.appointment_head.lecturer) ||
    !("ta" in body.appointment_head) ||
    !isStringList(body.appointment_head.ta) ||
    !("available_date" in body) ||
    typeof body.available_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.available_date) ||
    !("start_time" in body) ||
    typeof body.start_time !== "string" ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time) ||
    !("end_time" in body) ||
    typeof body.end_time !== "string" ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time) ||
    !("max_bookings" in body) ||
    typeof body.max_bookings !== "number" ||
    !Number.isInteger(body.max_bookings) ||
    body.max_bookings < 1 ||
    !("notes" in body) ||
    (typeof body.notes !== "string" && body.notes !== null)
  ) {
    return NextResponse.json({ detail: "A valid date, start/end time, host and max bookings are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/appointments/available/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: cookieStore.toString() },
        body: JSON.stringify({
          appointment_head: body.appointment_head,
          available_date: body.available_date,
          start_time: body.start_time,
          end_time: body.end_time,
          notes: body.notes,
          max_bookings: body.max_bookings,
        }),
      },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the appointment service" }, { status: 502 })
  }
}
