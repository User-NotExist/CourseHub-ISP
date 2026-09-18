import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl = process.env.API_REDIRECT_URL || "http://127.0.0.1:8000"
  return NextResponse.redirect(`${backendUrl}/auth/login`)
}
