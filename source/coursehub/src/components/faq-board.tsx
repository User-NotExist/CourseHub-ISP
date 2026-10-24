"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useParams, useRouter } from "next/navigation"

type Course = {
  course_id: string
  course_name: string
  role?: string
  can_edit?: boolean
}

// What the component renders.
type Faq = {
  faq_id: string
  title: string
  description: string | null
  can_edit: boolean
}

type ApiFaq = {
  faq_id: number
  title: string
  description: string | null
  can_edit: boolean
}

function toFaq(item: ApiFaq): Faq {
  return {
    faq_id: String(item.faq_id),
    title: item.title,
    description: item.description,
    can_edit: item.can_edit,
  }
}

export default function FaqBoard() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [coursesRes, faqsRes] = await Promise.all([
          fetch("/api_course/read"),
          fetch(`/api_faq/read?course_id=${encodeURIComponent(courseId)}`),
        ])
        if (!coursesRes.ok || !faqsRes.ok) throw new Error("Failed to load FAQs")

        const [courses, apiFaqs]: [Course[], ApiFaq[]] = await Promise.all([
          coursesRes.json(),
          faqsRes.json(),
        ])
        setCourse(courses.find((item) => item.course_id === courseId) ?? null)
        setFaqs(apiFaqs.map(toFaq))
      } catch {
        toast.error("Couldn't load this course's FAQs")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [courseId])

  // FAQ management is for Lecturers/TAs. The backend must still enforce this;
  // hiding the button is only a UX convenience.
  const canCreate = course?.role === "lecturer" || course?.role === "ta"

  return (
    <div className="flex w-full flex-1 min-w-0 flex-col p-6 md:p-10">
      {/* Page header */}
      <h1 className="mb-6 text-center text-3xl font-bold text-[#054a46] underline underline-offset-4">
        Frequently Asked Questions
      </h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xl font-bold">
          {course?.course_name ?? (isLoading ? "Loading..." : "Untitled course")}
        </p>
        {canCreate && (
          <Button
            type="button"
            onClick={() => router.push(`/courses/${courseId}/faq/create`)}
            className="h-12 shrink-0 gap-2 rounded-[10px] bg-[#006c67] px-8 text-lg font-bold text-white transition hover:bg-[#054a46]"
          >
            <Plus className="size-5" />
            New
          </Button>
        )}
      </div>

      <div className="flex-1 rounded-3xl bg-[#054a46] p-5 md:min-h-0">
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <p className="px-2 text-sm text-white/70">Loading...</p>
          ) : faqs.length === 0 ? (
            <p className="px-2 text-sm text-white/50">No FAQs here yet.</p>
          ) : (
            faqs.map((faq) => (
              <article
                key={faq.faq_id}
                className="rounded-2xl bg-[#6f9997] px-6 py-5 text-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="min-w-0 break-words text-2xl font-bold">{faq.title}</h2>
                  {faq.can_edit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit FAQ"
                        className="bg-white/70 text-[#054a46] hover:bg-white"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete FAQ"
                        className="bg-white/70 text-[#054a46] hover:bg-white"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                  {faq.description || "-"}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
