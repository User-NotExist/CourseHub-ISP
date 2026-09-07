"use client"

import { FiGrid, FiCalendar, FiLogOut } from "react-icons/fi"

export default function Sidebar() {
    return (
        <div className="bg-[#006C67] flex flex-col justify-between w-64 h-screen text-white">
            <div>
                <div className="p-6">
                    <h1 className="text-2xl font-bold border-b border-white/30 pb-3">CourseHub</h1>
                </div>

                <nav className="flex flex-col gap-1 px-3">
                    <button className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-lg px-4 py-3">
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
                    Greetings, johndoe@ku.th
                </div>
                <button className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-lg px-4 py-3 w-full">
                    <FiLogOut />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    )
}