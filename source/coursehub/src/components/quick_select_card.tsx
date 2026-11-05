"use client"

import { Card } from "@/components/ui/card"

// Shell only: will let the lecturer pick a start-to-end date range and mark the whole range available / unavailable.
export default function QuickSelectCard() {
    return (
        <Card className="flex min-w-0 flex-col gap-3 bg-gray-100 p-7 shadow-lg">
            <h3 className="text-lg font-bold">Quick select</h3>
        </Card>
    )
}
