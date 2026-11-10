"use client"

import { useEffect } from "react"

// Watches every fetch made by the app, if got (429), will bring u here
export default function RateLimitWatcher() {
    useEffect(() => {
        const originalFetch = window.fetch

        window.fetch = async (...args) => {
            const response = await originalFetch(...args)
            if (response.status === 429 && !window.location.pathname.startsWith("/rate-limited")) {
                const from = window.location.pathname + window.location.search
                window.location.replace(`/rate-limited?from=${encodeURIComponent(from)}`)
            }
            return response
        }

        return () => {
            window.fetch = originalFetch
        }
    }, [])

    return null
}
