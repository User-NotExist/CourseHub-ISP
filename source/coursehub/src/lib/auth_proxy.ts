import { NextResponse, type NextRequest } from "next/server"
import { clientIpHeader } from "@/lib/client_ip"

// Relays one step of the Google OAuth flow to the backend so the browser only
// ever talks to the frontend's origin and the backend port can stay private.
// The backend answers with redirects (to Google, or back to /courses) and sets
// cookies (`session` for the OAuth state, `access_token` after the callback);
// both are passed through untouched, so the cookies land on this origin.
export async function relayAuthStep(request: NextRequest, backendPath: string) {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"
    const cookieHeader = request.headers.get("cookie")

    let backendRes: Response
    try {
        backendRes = await fetch(`${backendUrl}${backendPath}${request.nextUrl.search}`, {
            headers: {
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
                ...clientIpHeader(request),
            },
            redirect: "manual",
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
        })
    } catch {
        return new NextResponse("Login service is unavailable. Please try again shortly.", {
            status: 503,
            headers: { "retry-after": "5", "cache-control": "no-store" },
        })
    }

    const headers = new Headers({ "cache-control": "no-store" })
    const location = backendRes.headers.get("location")
    if (location) headers.set("location", location)
    const contentType = backendRes.headers.get("content-type")
    if (contentType) headers.set("content-type", contentType)
    for (const cookie of backendRes.headers.getSetCookie()) {
        headers.append("set-cookie", cookie)
    }

    // Redirects have no useful body; errors (e.g. 403 wrong domain) keep theirs.
    const body = location ? null : await backendRes.arrayBuffer()
    return new NextResponse(body, { status: backendRes.status, headers })
}
