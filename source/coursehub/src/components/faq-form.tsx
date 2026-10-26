"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Course = {
  course_id: string
  course_name: string
}

// Shape returned by GET /api_faq/read?course_id=...&faq_id=...
type ApiFaq = {
  faq_id: number
  title: string
  description: string | null
  can_edit: boolean
}

// Reads the backend's error message from a failed response.
async function readDetail(res: Response, fallback: string) {
  const data: unknown = await res.json().catch(() => null)
  return typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof data.detail === "string"
    ? data.detail
    : fallback
}

// Create mode: <FaqForm />            (page: /courses/[id]/faq/create)
// Edit mode:   <FaqForm faqId="12" /> (page: /courses/[id]/faq/[faqId]/edit)
export default function FaqForm({ faqId }: { faqId?: string }) {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const isEdit = Boolean(faqId)

  const [course, setCourse] = useState<Course | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const backHref = `/courses/${courseId}/faq`

  // Load the course name, and (in edit mode) the FAQ to fill the fields with.
  useEffect(() => {
    async function load() {
      try {
        const coursesRes = await fetch("/api_course/read")
        if (!coursesRes.ok) throw new Error()
        const courses: Course[] = await coursesRes.json()
        setCourse(courses.find((item) => item.course_id === courseId) ?? null)

        if (faqId) {
          const faqRes = await fetch(
            `/api_faq/read?course_id=${encodeURIComponent(courseId)}&faq_id=${encodeURIComponent(faqId)}`,
          )
          if (!faqRes.ok) throw new Error(await readDetail(faqRes, "Couldn't load this FAQ"))
          const current: ApiFaq = await faqRes.json()
          if (!current.can_edit) {
            // The backend also rejects the save; this just avoids showing a form that can't work.
            toast.error("You don't have permission to edit this FAQ")
            router.replace(backHref)
            return
          }
          setTitle(current.title)
          setDescription(current.description ?? "")
        }
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : "Couldn't load this FAQ")
        // Don't let someone save over a FAQ that never loaded.
        if (faqId) setLoadFailed(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [courseId, faqId, backHref, router])

  async function handleSave() {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(isEdit ? "/api_faq/edit" : "/api_faq/create", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          faq_id: faqId,
          title: title.trim(),
          description: description.trim(),
        }),
      })
      if (!res.ok) throw new Error(await readDetail(res, "Couldn't save this FAQ"))
      toast.success(isEdit ? "FAQ updated" : "FAQ created")
      router.push(backHref)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this FAQ")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-1 min-w-0 flex-col p-6 md:p-10">
      {/* Title and course name on the left, Cancel / Save on the right (as in Figma) */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
            {isEdit ? "Edit FAQ" : "Create FAQ"}
          </h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">{course?.course_name ?? "Loading..."}</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backHref)}
            disabled={isSaving}
            className="h-auto rounded-xl border-brand/30 bg-white px-5 py-3 text-base font-semibold text-brand-ink shadow-sm transition hover:bg-brand hover:text-brand-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || loadFailed}
            className="h-auto rounded-xl bg-brand px-6 py-3 text-base font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover"
          >
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-6 rounded-3xl bg-panel p-6 shadow-lg ring-1 ring-black/10 lg:p-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="faq-title" className="text-sm font-medium uppercase tracking-wider text-panel-muted">
            Title<span className="text-panel-danger">*</span>
          </label>
          <Input
            id="faq-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={isLoading || isSaving || loadFailed}
            className="h-auto rounded-xl border-panel-border bg-panel-surface px-4 py-3 text-base text-panel-foreground placeholder:text-panel-subtle focus-visible:border-panel-foreground focus-visible:ring-0 md:text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="faq-description" className="text-sm font-medium uppercase tracking-wider text-panel-muted">
            Description<span className="text-panel-danger">*</span>
          </label>
          <textarea
            id="faq-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={10}
            disabled={isLoading || isSaving || loadFailed}
            className="w-full resize-y rounded-xl border border-panel-border bg-panel-surface px-4 py-3 text-base leading-7 text-panel-foreground outline-none placeholder:text-panel-subtle focus:border-panel-foreground disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}