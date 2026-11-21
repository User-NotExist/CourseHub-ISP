import type { NextRequest } from "next/server"
import { relayAuthStep } from "@/lib/auth_proxy"

// Google redirects here (GOOGLE_REDIRECT_URI must point at this route);
// the backend exchanges the code and sets the access_token cookie
// (backend/auth/auth.py: GET /auth/callback).
export async function GET(request: NextRequest) {
    return relayAuthStep(request, "/auth/callback")
}
