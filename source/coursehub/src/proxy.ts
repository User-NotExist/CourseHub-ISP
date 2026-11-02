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

// Where a guest was headed before being sent to log in. A cookie rather than
// ?next= because the backend's OAuth callback always lands on /courses.
const RETURN_TO_COOKIE = "return_to"
const RETURN_TO_MAX_AGE = 60 * 10 // long enough to finish the Google login
const POST_LOGIN_PATH = "/courses"

// Only same-origin paths; rejects "//evil.com", "/\\evil.com", absolute URLs.
function safeReturnPath(value: string | undefined, request: NextRequest): string | null {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
        return null
    }
    try {
        const url = new URL(value, request.url)
        if (url.origin !== request.nextUrl.origin) return null
        return url.pathname + url.search
    } catch {
        return null
    }
}

function redirectWithoutReturnTo(path: string, request: NextRequest) {
    const response = NextResponse.redirect(new URL(path, request.url))
    response.cookies.delete({ name: RETURN_TO_COOKIE, path: "/" })
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
        const response = NextResponse.redirect(new URL("/", request.url))
        response.cookies.set(RETURN_TO_COOKIE, pathname + request.nextUrl.search, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: request.nextUrl.protocol === "https:",
            maxAge: RETURN_TO_MAX_AGE,
        })
        return withClearedToken(response, status)
    }

    if (isAuthenticated) {
        const returnTo = safeReturnPath(request.cookies.get(RETURN_TO_COOKIE)?.value, request)

        if (isLoginRoute) {
            return redirectWithoutReturnTo(returnTo ?? POST_LOGIN_PATH, request)
        }

        // First stop after the OAuth callback: forward to the saved page once.
        if (pathname === POST_LOGIN_PATH && returnTo && returnTo !== POST_LOGIN_PATH) {
            return redirectWithoutReturnTo(returnTo, request)
        }

        if (request.cookies.has(RETURN_TO_COOKIE)) {
            const response = NextResponse.next()
            response.cookies.delete({ name: RETURN_TO_COOKIE, path: "/" })
            return response
        }
    }

    return withClearedToken(NextResponse.next(), status)
}

export const config = {
    matcher: ["/", "/api_auth/auth", "/courses/:path*", "/schedule/:path*"],
}
