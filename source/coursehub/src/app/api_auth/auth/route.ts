import { NextResponse, type NextRequest } from "next/server"

// Login goes through our own /auth/login relay, so the browser never needs
// to reach the backend directly.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/login", request.url))
}
