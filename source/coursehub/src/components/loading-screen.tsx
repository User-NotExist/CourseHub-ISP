"use client"

import Image from "next/image"
import { LoaderCircle } from "lucide-react"

export default function LoadingScreen() {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Loading CourseHub"
            className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-background"
        >
            <div className="flex flex-col items-center gap-5">
                <Image
                    src="/icon.png"
                    alt=""
                    width={88}
                    height={88}
                    priority
                    className="size-22 rounded-2xl shadow-md motion-safe:animate-pulse"
                />
                <p className="text-lg font-semibold tracking-wide text-brand-ink">Loading...</p>
                <LoaderCircle aria-hidden="true" className="size-6 text-brand motion-safe:animate-spin" />
            </div>
        </div>
    )
}
