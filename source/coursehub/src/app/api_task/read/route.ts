import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/tasks/read`,
      { headers: { cookie: cookieHeader }, cache: "no-store" },
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
    !["To-Do", "In-Progress", "Done"].includes(String(body.status)) ||
    ("task_assignee_gmail" in body &&
      body.task_assignee_gmail !== null &&
      typeof body.task_assignee_gmail !== "string")
  ) {
    return NextResponse.json({ detail: "Course, task, and valid status are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const courseId = body.course_id
  const taskId = String(body.task_id)
  const assigneeEmail =
    "task_assignee_gmail" in body && typeof body.task_assignee_gmail === "string"
      ? body.task_assignee_gmail
      : null
  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: cookieHeader },
        body: JSON.stringify({
          status: body.status,
          task_assignee_gmail: assigneeEmail,
        }),
      },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the task service" }, { status: 502 })
  }
}
