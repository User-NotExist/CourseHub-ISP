"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

// Only allow going back to a page on this site
function safePath(value: string | null) {
    return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/rate-limited") ? value : "/courses"
}

function RateLimited() {
    const from = safePath(useSearchParams().get("from"))

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
            <Clock className="size-12 text-[#006C67]" />
            <h1 className="text-3xl font-bold text-[#054a46]">Too many requests</h1>
            <p className="max-w-md text-muted-foreground">
                You&apos;re going a bit too fast. Please wait a moment, then try again.
            </p>
            <Button
                className="mt-2 bg-[#006C67] px-6 text-white hover:bg-[#054a46]"
                onClick={() => window.location.replace(from)}
            >
                Reload
            </Button>
        </div>
    )
}

export default function RateLimitedPage() {
    return (
        <Suspense>
            <RateLimited />
        </Suspense>
    )
}
