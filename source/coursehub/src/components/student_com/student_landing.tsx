"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronDown, Loader2, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Faq = {
    faq_id: number
    faq_owner_id: number
    creator: string
    title: string
    description: string | null
    createdAt: string
}

export default function StudentLanding() {
    const { id: courseId } = useParams<{ id: string }>()
    const router = useRouter()

    const [search, setSearch] = useState("")
    const [openId, setOpenId] = useState<number | null>(null)
    const [courseName, setCourseName] = useState<string | null>(null)
    const [allFaqs, setAllFaqs] = useState<Faq[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api_course/read_name?course_id=${encodeURIComponent(courseId)}`)
            .then((res) => {
                if (!res.ok) throw new Error("Course not found")
                return res.json()
            })
            .then((data) => setCourseName(data.course_name))
            .catch(() => setCourseName("Course not found"))

        fetch(`/api_faq/student_read?course_id=${encodeURIComponent(courseId)}`)
            .then(async (res) => {
                const data = await res.json()
                if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load FAQs")
                setAllFaqs(data)
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load FAQs"))
            .finally(() => setIsLoading(false))
    }, [courseId])

    const faqs = allFaqs.filter((faq) =>
        faq.title.toLowerCase().includes(search.trim().toLowerCase())
    )

    return (
        <div className="flex min-h-screen w-full flex-col p-6 md:p-10">
            <div className="flex items-start justify-between gap-4">
                <p className="font-bold">{courseName ?? "Loading..."}</p>
                <Button
                    className="gap-2 bg-[#006c67] text-white hover:bg-[#054a46] px-6"
                    onClick={() => router.push(`/students/${courseId}/appointment`)}
                >
                    <Plus className="size-4" />
                    Consult
                </Button>
            </div>

            <h1 className="mt-2 text-center text-3xl font-bold text-[#054a46]">
                Course FAQ
            </h1>

            <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col gap-3">
                <div className="relative">
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2" />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="size-6 animate-spin text-[#054a46]" />
                    </div>
                ) : error ? (
                    <p className="text-center text-sm text-red-600">{error}</p>
                ) : faqs.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No FAQ found.</p>
                ) : (
                    faqs.map((faq) => (
                        <div key={faq.faq_id} className="rounded-md bg-[#f2f2f2]">
                            <button
                                className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold"
                                onClick={() => setOpenId(openId === faq.faq_id ? null : faq.faq_id)}
                            >
                                {faq.title}
                                <ChevronDown
                                    className={`size-5 transition-transform ${openId === faq.faq_id ? "rotate-180" : ""}`}
                                />
                            </button>
                            {openId === faq.faq_id && (
                                <div className="flex flex-col gap-1 px-4 pb-3">
                                    <p className="text-xs font-semibold">{faq.creator}</p>
                                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                        {faq.description || "No answer yet."}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}