import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"
    try {
        const response = await fetch(`${backendUrl}/overview/agenda`, {
            headers: { cookie: (await cookies()).toString() },
            cache: "no-store",
        })
        return NextResponse.json(await response.json(), { status: response.status })
    } catch {
        return NextResponse.json({ detail: "Unable to reach the agenda service !" }, { status: 502 })
    }
}