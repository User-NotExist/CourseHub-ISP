"use client"

import { useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [faqToDelete, setFaqToDelete] = useState<Faq | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  async function handleDelete() {
    if (!faqToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      const res = await fetch("/api_faq/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, faq_id: faqToDelete.faq_id }),
      })
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null)
        // Already deleted elsewhere: drop it from the list instead of leaving a stale card.
        if (res.status === 404) {
          setFaqs((current) => current.filter((item) => item.faq_id !== faqToDelete.faq_id))
          setFaqToDelete(null)
        }
        throw new Error(
          typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
            ? data.detail
            : "Couldn't delete this FAQ",
        )
      }
      setFaqs((current) => current.filter((item) => item.faq_id !== faqToDelete.faq_id))
      setFaqToDelete(null)
      toast.success("FAQ deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete this FAQ")
    } finally {
      setIsDeleting(false)
    }
  }

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
                        onClick={() => router.push(`/courses/${courseId}/faq/${faq.faq_id}/edit`)}
                        className="bg-white/70 text-[#054a46] hover:bg-white"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete FAQ"
                        onClick={() => setFaqToDelete(faq)}
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

      <AlertDialog
        open={faqToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setFaqToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{faqToDelete?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              {isDeleting ? "Deleting…" : "Delete FAQ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}