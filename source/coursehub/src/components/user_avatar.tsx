import { cn } from "@/lib/utils"

// "Pasin Makcharoen" -> "PM"
export function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
}

export default function UserAvatar({ name, className }: { name: string | null; className?: string }) {
    return (
        <div
            className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#006C67]",
                className,
            )}
        >
            {name ? getInitials(name) : "?"}
        </div>
    )
}
