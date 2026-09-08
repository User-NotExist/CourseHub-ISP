import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

    const body = await request.json()

    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    const backendRes = await fetch(`${backendUrl}/course/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            cookie: cookieHeader,
        },
        body: JSON.stringify(body),
    })

    if (!backendRes.ok) {
        const errorData = await backendRes.json().catch(() => ({}))
        return NextResponse.json(errorData, { status: backendRes.status })
    }

    const data = await backendRes.json()
    return NextResponse.json(data, { status: 200 })
}