import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export async function DELETE(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== "object" ||
    body === null ||
    !("course_id" in body) ||
    typeof body.course_id !== "string" ||
    !body.course_id ||
    !("log_id" in body) ||
    typeof body.log_id !== "string" ||
    !/^\d+$/.test(body.log_id)
  ) {
    return NextResponse.json({ detail: "Course ID and valid log ID are required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  if (!cookieStore.get("access_token")) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${backendUrl}/course/${encodeURIComponent(body.course_id)}/consultation_logs/delete/${body.log_id}`,
      {
        method: "DELETE",
        headers: { cookie: cookieStore.toString() },
      },
    );
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Unable to reach the consultation service" }, { status: 502 });
  }
}
