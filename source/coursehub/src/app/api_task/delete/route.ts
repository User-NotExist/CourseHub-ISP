import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl =
    process.env.BACKEND_URL || "http://localhost:8000"

export async function DELETE(request: NextRequest) {
    const body: unknown = await request.json()

    if (
        typeof body !== "object" ||
        body === null ||
        !("course_id" in body) ||
        typeof body.course_id !== "string" ||
        !body.course_id ||
        !("task_id" in body) ||
        (typeof body.task_id !== "number" &&
            typeof body.task_id !== "string")
    ) {
        return NextResponse.json(
            { detail: "Course ID and task ID are required" },
            { status: 400 }
        )
    }

    const cookieStore = await cookies()

    if (!cookieStore.get("access_token")) {
        return NextResponse.json(
            { detail: "Not authenticated" },
            { status: 401 }
        )
    }

    try {
        const response = await fetch(
            `${backendUrl}/course/${encodeURIComponent(
                body.course_id
            )}/tasks/delete/${encodeURIComponent(
                String(body.task_id)
            )}`,
            {
                method: "DELETE",
                headers: {
                    cookie: cookieStore.toString(),
                },
            }
        )

        return NextResponse.json(
            await response.json(),
            { status: response.status }
        )
    } catch {
        return NextResponse.json(
            { detail: "Unable to reach the task service" },
            { status: 502 }
        )
    }
}