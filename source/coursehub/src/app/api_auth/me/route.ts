import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const backendRes = await fetch(`${backendUrl}/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
  })

  if (!backendRes.ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: backendRes.status })
  }

  const data = await backendRes.json()
  return NextResponse.json(data, { status: 200 })
}