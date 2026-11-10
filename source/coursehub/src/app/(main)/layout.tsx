"use client"

import "../globals.css";
import Sidebar from "@/components/sidebar/sidebar"

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <div className="flex flex-row min-h-full flex flex-col">
            <Sidebar />
            <div className="flex flex-col items-center justify-center w-full">
                {children}
            </div>
        </div>
    );
}