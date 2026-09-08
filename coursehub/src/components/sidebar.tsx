"use client"

import { useEffect, useState } from "react"
import { FiGrid, FiCalendar, FiLogOut } from "react-icons/fi"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function Sidebar() {
    const router = useRouter()
    const [email, setEmail] = useState<string | null>(null)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    useEffect(() => {
        fetch(`/api_auth/me`, { credentials: "include" })
            .then((res) => {
                if (!res.ok) throw new Error("Not authenticated")
                return res.json()
            })
            .then((data) => { setEmail(data.email) })
            .catch(() => setEmail(null))
    }, [])

    const handle_logout = async () => {
        setIsLoggingOut(true)
        await fetch("/api_auth/logout", { method: "POST", credentials: "include" })
        toast.success("Logout successful.", {position: "top-right"})
        setTimeout(() => {
            router.replace("/")
        }, 1200)
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

                    <button className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-lg px-4 py-3">
                        <FiCalendar />
                        <span>Calendar</span>
                    </button>
                </nav>
            </div>

            <div>
                <div className="bg-black/10 px-4 py-2 text-sm">
                    Hi, {email ?? "..."}
                </div>
                <AlertDialog>
                    <AlertDialogTrigger
                        className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors px-4 py-3 w-full"
                    >
                        <div className="contents">
                            <FiLogOut />
                            <span>Logout</span>
                        </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Logout</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to logout from the application?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handle_logout} disabled={isLoggingOut}>Logout</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}