import type { NextRequest } from "next/server"
import { relayAuthStep } from "@/lib/auth_proxy"

// Starts Google OAuth via the backend (backend/auth/auth.py: GET /auth/login).
export async function GET(request: NextRequest) {
    return relayAuthStep(request, "/auth/login")
}
