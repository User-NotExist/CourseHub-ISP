import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null)
    const courseId = body?.course_id
    const avaliableId = body?.avaliable_id
    if (typeof courseId !== "string" || !courseId || (typeof avaliableId !== "number" && typeof avaliableId !== "string")) {
        return NextResponse.json({ detail: "Course ID and slot ID are required" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(
            `${backendUrl}/students/${encodeURIComponent(courseId)}/appointments/book/${encodeURIComponent(String(avaliableId))}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_first_name: body.student_first_name,
                    student_last_name: body.student_last_name,
                    student_email: body.student_email,
                    appointments_description: body.appointments_description ?? null,
                }),
            },
        )
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the appointment service !" }, { status: 502 })
    }
}