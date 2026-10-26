"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

import { ArrowLeft } from "lucide-react"

import CourseSidebar from "@/components/course_sidebar"

export default function RootLayout({ children }: LayoutProps<"/">) {
  const router = useRouter()

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <CourseSidebar />
      <div className="flex flex-col items-center justify-center-safe flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}