import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

// Staff (lecturer / TA) view of the appointments students booked.
// GET /api_appointment/read?course_id=...                  -> every slot of the course (with booked counts)
// GET /api_appointment/read?course_id=...&slot_id=...      -> one slot, including the students who booked it
export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const slotId = request.nextUrl.searchParams.get("slot_id")

  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }
  if (slotId !== null && !/^\d+$/.test(slotId)) {
    return NextResponse.json({ detail: "Slot ID must be a number" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const path = slotId ? `/avaliable/read/${slotId}` : "/avaliable/read"
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/appointments${path}`,
      { headers: { cookie: cookieStore.toString() }, cache: "no-store" },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the appointment service" }, { status: 502 })
  }
}
