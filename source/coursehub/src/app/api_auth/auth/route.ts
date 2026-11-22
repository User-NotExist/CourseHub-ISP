import { NextResponse } from "next/server"

// Login goes through our own /auth/login relay, so the browser never needs
// to reach the backend directly.
// The Location is relative on purpose: under `next start` request.url is built
// from the bind address (http://0.0.0.0:3000), not the host the browser used,
// so `new URL(path, request.url)` would send users to 0.0.0.0 in deployment.
export async function GET() {
  return new NextResponse(null, {
    status: 307,
    headers: { location: "/auth/login", "cache-control": "no-store" },
  })
}
