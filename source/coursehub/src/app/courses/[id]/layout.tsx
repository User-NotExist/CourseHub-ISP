"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

import { ArrowLeft } from "lucide-react"

import CourseSidebar from "@/components/course_sidebar"

export default function RootLayout({ children }: LayoutProps<"/">) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen">
      <CourseSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}