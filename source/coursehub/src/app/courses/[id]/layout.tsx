"use client"

import CourseSidebar from "@/components/course_sidebar"

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <div className="flex flex-row min-h-full flex flex-col">
            <CourseSidebar />
            <div className="flex flex-col items-center justify-center w-full">
                {children}
            </div>
        </div>
    );
}