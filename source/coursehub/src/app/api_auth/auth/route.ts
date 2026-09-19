import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const backendUrl = process.env.API_REDIRECT_URL || "http://127.0.0.1:8000"
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  if (cookieHeader) {
    const meRes = await fetch(`${backendUrl}/auth/me`, {
      headers: { cookie: cookieHeader },
    }).catch(() => null)

    if (meRes?.ok) {
      return NextResponse.redirect(`${frontendUrl}/courses`)
    }
  }
  
  return NextResponse.redirect(`${backendUrl}/auth/login`)
}
