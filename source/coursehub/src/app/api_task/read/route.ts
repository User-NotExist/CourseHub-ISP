import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const accessToken = (await cookies()).get("access_token")?.value

  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }
  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/tasks/read?access_token=${encodeURIComponent(accessToken)}`,
      { cache: "no-store" },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the task service" }, { status: 502 })
  }
}

export async function PATCH(request: NextRequest) {
  const body: unknown = await request.json()
  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !("task_id" in body) ||
    (typeof body.task_id !== "number" && typeof body.task_id !== "string") ||
    !("status" in body) ||
    !["To-Do", "In-Progress", "Done"].includes(String(body.status))
  ) {
    return NextResponse.json({ detail: "Course, task, and valid status are required" }, { status: 400 })
  }

  const accessToken = (await cookies()).get("access_token")?.value
  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const courseId = body.course_id
  const taskId = String(body.task_id)
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/tasks/${encodeURIComponent(taskId)}?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: body.status }),
      },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the task service" }, { status: 502 })
  }
}
