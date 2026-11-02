import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

// Must match the backend's JWT_SECRET_KEY / JWT_ALGORITHM (backend/auth/auth.py).
const JWT_ALGORITHM = "HS256"
const jwtSecret = process.env.JWT_SECRET_KEY
    ? new TextEncoder().encode(process.env.JWT_SECRET_KEY)
    : null

if (!jwtSecret) {
    console.error("[proxy] JWT_SECRET_KEY is not set; all protected routes will redirect to /")
}

// Verify the token locally instead of calling the backend on every request.
// This is an optimistic gate for page access only; the backend still
// authorizes every data request (and catches e.g. deleted users).
async function isValidToken(token: string): Promise<boolean> {
    if (!jwtSecret) return false
    try {
        await jwtVerify(token, jwtSecret, {
            algorithms: [JWT_ALGORITHM],
            requiredClaims: ["sub", "exp"],
        })
        return true
    } catch {
        return false
    }
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    // The landing page must be public: protected routes redirect guests here.
    if (pathname === "/") {
        return NextResponse.next()
    }

    const isLoginRoute = pathname === "/api_auth/auth"
    const accessToken = request.cookies.get("access_token")?.value
    const isAuthenticated = accessToken ? await isValidToken(accessToken) : false

    if (!isAuthenticated && !isLoginRoute) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    if (isAuthenticated && isLoginRoute) {
        return NextResponse.redirect(new URL("/courses", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/", "/api_auth/auth", "/courses/:path*", "/schedule/:path*"],
}
