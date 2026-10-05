import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
const taskStatuses = ["To-Do", "In-Progress", "Done"]

function isTaskAssigneeList(value: unknown): value is { task_assignee_gmail: string; status: string }[] {
  return Array.isArray(value) && value.every((assignee) =>
    typeof assignee === "object" &&
    assignee !== null &&
    "task_assignee_gmail" in assignee &&
    typeof assignee.task_assignee_gmail === "string" &&
    "status" in assignee &&
    taskStatuses.includes(String(assignee.status)),
  )
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json()
  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !("task_name" in body) ||
    typeof body.task_name !== "string" ||
    !body.task_name.trim() ||
    !("task_description" in body) ||
    (typeof body.task_description !== "string" && body.task_description !== null) ||
    !("task_due_date" in body) ||
    (typeof body.task_due_date !== "string" && body.task_due_date !== null) ||
    !("task_assignee" in body) ||
    !isTaskAssigneeList(body.task_assignee)
  ) {
    return NextResponse.json({ detail: "Valid task name, description, due date, and assignees are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/tasks/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify({
          task_name: body.task_name,
          task_description: body.task_description,
          task_due_date: body.task_due_date,
          task_assignee: body.task_assignee,
        }),
      },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the task service" }, { status: 502 })
  }
}