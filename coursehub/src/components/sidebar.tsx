"use client"

import { useEffect, useState } from "react"
import { FiGrid, FiCalendar, FiLogOut, FiPlusCircle } from "react-icons/fi"
import { useRouter } from "next/navigation"

export default function Sidebar() {
    const router = useRouter()
    const [email, setEmail] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api_auth/me`, { credentials: "include" })
            .then((res) => {
                if (!res.ok) throw new Error("Not authenticated")
                return res.json()
            })
            .then((data) => { setEmail(data.email) })
            .catch(() => setEmail(null))
    })

    const handle_logout = async () => {
        if (!confirm("Logout from the application ?")) {
            return
        }

        await fetch("/api_auth/logout", { method: "POST", credentials: "include" })

        router.replace("/")
    }

    return (
        <div className="bg-[#006C67] flex flex-col justify-between w-55 h-screen text-white">
            <div>
                <div className="p-6">
                    <h1 className="text-2xl font-bold border-white/30 pb-3">CourseHub</h1>
                    <div className="flex flex-col items-center justify-center pt-2">
                        <div className="bg-white w-max px-28 h-[1px]" />
                    </div>
                </div>

                <nav className="flex flex-col gap-1 px-3">
                    <button
                        className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-lg px-4 py-3"
                        onClick={() => router.push("/courses")}
                    >
                        <FiGrid />
                        <span>Courses</span>
                    </button>

                    <button
                        className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-lg px-4 py-3"
                        onClick={() => router.push("/courses/create")}
                    >
                        <FiPlusCircle />
                        <span>Create Course</span>
                    </button>

                    <button
                        className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-lg px-4 py-3"
                        onClick={() => router.push("/schedule")}
                    >
                        <FiCalendar />
                        <span>Schedule</span>
                    </button>
                </nav>
            </div>

            <div>
                <div className="bg-black/10 px-4 py-2 text-sm">
                    Hi, {email ?? "..."}
                </div>
                <button
                    className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors px-4 py-3 w-full"
                    onClick={() => handle_logout()}
                >
                    <FiLogOut />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    )
}