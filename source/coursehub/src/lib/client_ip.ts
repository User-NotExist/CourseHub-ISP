import type { NextRequest } from "next/server"

// Read real user IP, sent to the backend so rate limits are per person
export function clientIpHeader(request: NextRequest): Record<string, string> {
    const ip =
        request.headers.get("cf-connecting-ip") ??
        // last entry is added by our own proxy, so the client can't fake it
        request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
        request.headers.get("x-real-ip") ?? ""
    return ip ? { "x-client-ip": ip } : {}
}
