"use client"

import CourseSidebar from "@/components/sidebar/course_sidebar"

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <CourseSidebar />
      <div className="flex flex-col items-center justify-center-safe flex-1 min-w-0 overflow-y-auto scrollbar-none">
        {children}
      </div>
    </div>
  );
}