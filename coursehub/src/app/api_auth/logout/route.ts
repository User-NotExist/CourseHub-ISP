import { NextResponse } from "next/server"

export async function POST() {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"

    const backendRes = await fetch(`${backendUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
    })

    const res_ = NextResponse.json(
        { message: "Logout success!" },
        { status: 200 }
    )

    const setCookie = backendRes.headers.get("set-cookie")
    if (setCookie) {
        res_.headers.set("set-cookie", setCookie)
    }

    return res_
}