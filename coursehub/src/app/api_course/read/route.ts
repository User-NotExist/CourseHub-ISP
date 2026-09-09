import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    const backendRes = await fetch(`${backendUrl}/course/display-course`, {
        method: "GET",
        headers: {
            cookie: cookieHeader,
        },
    })

    if (!backendRes.ok) {
        const errorData = await backendRes.json().catch(() => ({}))
        return NextResponse.json(errorData, { status: backendRes.status })
    }

    const data = await backendRes.json()
    return NextResponse.json(data, { status: 200 })
}