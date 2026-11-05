import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/course/display-course-archived`, {
            headers: { cookie: (await cookies()).toString() },
            cache: "no-store",
        })
        const data = await response.json().catch(() => ({}))
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the course service !" }, { status: 502 })
    }
}
