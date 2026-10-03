import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    // The landing page must be public: protected routes redirect guests here.
    if (pathname === "/") {
        return NextResponse.next()
    }

    const isLoginRoute = pathname === "/api_auth/auth"
    const accessToken = request.cookies.get("access_token")?.value
    let isAuthenticated = false

    if (accessToken) {
        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"

        try {
            // Let the token issuer verify the signature, expiry, and user.
            const response = await fetch(`${backendUrl}/auth/me`, {
                headers: { cookie: `access_token=${accessToken}` },
                cache: "no-store",
                redirect: "error",
                signal: AbortSignal.timeout(5000),
            })
            isAuthenticated = response.ok
        } catch {
            // Keep protected pages inaccessible if validation is unavailable.
            isAuthenticated = false
        }
    }

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
