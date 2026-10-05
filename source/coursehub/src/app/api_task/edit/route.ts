import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const taskId = request.nextUrl.searchParams.get("task_id")
  const cookieStore = await cookies()

  if (!courseId || !taskId) {
    return NextResponse.json({ detail: "Course ID and task ID are required" }, { status: 400 })
  }
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/tasks/read/${encodeURIComponent(taskId)}`,
      { headers: { cookie: cookieStore.toString() }, cache: "no-store" },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the task service" }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  const body: unknown = await request.json()
  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !("task_id" in body) ||
    (typeof body.task_id !== "number" && typeof body.task_id !== "string") ||
    !("task_name" in body) ||
    typeof body.task_name !== "string" ||
    !body.task_name.trim() ||
    !("task_description" in body) ||
    (typeof body.task_description !== "string" && body.task_description !== null) ||
    !("task_due_date" in body) ||
    (typeof body.task_due_date !== "string" && body.task_due_date !== null)
  ) {
    return NextResponse.json({ detail: "Valid task title, description, and due date are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/tasks/edit/${encodeURIComponent(String(body.task_id))}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify({
          task_name: body.task_name,
          task_description: body.task_description,
          task_due_date: body.task_due_date,
        }),
      },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the task service" }, { status: 502 })
  }
}
