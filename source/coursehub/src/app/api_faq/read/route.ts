import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id")
  const faqId = request.nextUrl.searchParams.get("faq_id") // optional: read a single FAQ
  const cookieStore = await cookies()

  if (!courseId) {
    return NextResponse.json({ detail: "Course ID is required" }, { status: 400 })
  }
  if (faqId !== null && !/^\d+$/.test(faqId)) {
    return NextResponse.json({ detail: "FAQ ID must be a number" }, { status: 400 })
  }
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(courseId)}/faqs/read${faqId ? `/${faqId}` : ""}`,
      { headers: { cookie: cookieStore.toString() }, cache: "no-store" },
    )
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ detail: "Unable to reach the FAQ service" }, { status: 502 })
  }
}