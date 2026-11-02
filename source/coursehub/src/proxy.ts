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
// "unverifiable" = server misconfigured (no secret); don't blame the token.
type TokenStatus = "missing" | "valid" | "invalid" | "unverifiable"

async function checkToken(token: string | undefined): Promise<TokenStatus> {
    if (!token) return "missing"
    if (!jwtSecret) return "unverifiable"
    try {
        await jwtVerify(token, jwtSecret, {
            algorithms: [JWT_ALGORITHM],
            requiredClaims: ["sub", "exp"],
        })
        return "valid"
    } catch {
        return "invalid"
    }
}

// Drop a bad token so later requests don't keep re-checking it.
// path must match how the backend set it (backend/auth/auth.py).
function withClearedToken(response: NextResponse, status: TokenStatus) {
    if (status === "invalid") {
        response.cookies.delete({ name: "access_token", path: "/" })
    }
    return response
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    // The landing page must be public: protected routes redirect guests here.
    if (pathname === "/") {
        return NextResponse.next()
    }

    const isLoginRoute = pathname === "/api_auth/auth"
    const status = await checkToken(request.cookies.get("access_token")?.value)
    const isAuthenticated = status === "valid"

    if (!isAuthenticated && !isLoginRoute) {
        return withClearedToken(NextResponse.redirect(new URL("/", request.url)), status)
    }

    if (isAuthenticated && isLoginRoute) {
        return NextResponse.redirect(new URL("/courses", request.url))
    }

    return withClearedToken(NextResponse.next(), status)
}

export const config = {
    matcher: ["/", "/api_auth/auth", "/courses/:path*", "/schedule/:path*"],
}
