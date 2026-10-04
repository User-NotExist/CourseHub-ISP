"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

import { ArrowLeft } from "lucide-react"

import CourseSidebar from "@/components/course_sidebar"

export default function RootLayout({ children }: LayoutProps<"/">) {
  const router = useRouter()

  return (
    <div className="flex flex-row min-h-full flex flex-col">
      <CourseSidebar />
      <div className="flex flex-col items-center justify-center w-full">
        {children}
      </div>
    </div>
  );
}