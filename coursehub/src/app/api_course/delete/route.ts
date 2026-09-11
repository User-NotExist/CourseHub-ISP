import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ course_id: string }> }
) {
    try {
        const { course_id } = await params

        const access_token = request.cookies.get("access_token")

        if (!access_token) {
            return NextResponse.json(
                { detail: "Not authenticated" },
                { status: 401 }
            )
        }

        const response = await fetch(
            `http://localhost:8000/course/delete/${course_id}`,
            {
                method: "DELETE",
                headers: {
                    Cookie: `access_token=${access_token.value}`,
                },
            }
        )

        const data = await response.json()

        return NextResponse.json(data, {
            status: response.status,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            { detail: "Error while deleting course" },
            { status: 500 }
        )
    }
}