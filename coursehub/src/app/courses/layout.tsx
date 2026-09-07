"use client"

import type { Metadata } from "next";
import { Geist_Mono, Inria_Sans } from "next/font/google";
import "../globals.css";
import Sidebar from "@/components/sidebar"

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const inriaSans = Inria_Sans({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    weight: ["300", "400", "700"],
});

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
