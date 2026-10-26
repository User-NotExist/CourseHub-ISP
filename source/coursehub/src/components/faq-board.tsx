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
    <div className="flex w-270 flex-1 min-w-0 flex-col p-6 md:p-10 h-screen">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">
            {course?.course_name ?? (isLoading ? "Loading..." : "Untitled course")}
          </p>
        </div>
        {canCreate && (
          <Button
            type="button"
            onClick={() => router.push(`/courses/${courseId}/faq/create`)}
            className="h-auto shrink-0 gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Plus className="size-4" />
            New
          </Button>
        )}
      </div>

      <div className="flex-1 rounded-3xl bg-panel p-6 shadow-lg ring-1 ring-black/10 md:min-h-0 lg:p-8 overflow-y-auto scrollbar-none">
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <p className="px-2 text-sm text-panel-muted">Loading...</p>
          ) : faqs.length === 0 ? (
            <p className="px-2 text-sm text-panel-muted">No FAQs here yet.</p>
          ) : (
            faqs.map((faq) => (
              <article
                key={faq.faq_id}
                className="rounded-2xl bg-panel-surface px-6 py-5 text-panel-foreground transition hover:bg-panel-surface-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="min-w-0 break-words text-2xl font-semibold leading-snug">{faq.title}</h2>
                  {faq.can_edit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        aria-label="Edit FAQ"
                        onClick={() => router.push(`/courses/${courseId}/faq/${faq.faq_id}/edit`)}
                        className="rounded-xl bg-white text-brand-ink shadow-sm hover:bg-white/90"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        aria-label="Delete FAQ"
                        onClick={() => setFaqToDelete(faq)}
                        className="rounded-xl bg-destructive text-white shadow-sm hover:bg-destructive/90"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-base leading-7 text-panel-muted">
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
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
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