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
      <h1 className="mb-6 text-center text-3xl font-bold text-[#054a46] underline underline-offset-4">
        {isEdit ? "Edit FAQ" : "Create FAQ"}
      </h1>

      {/* Course name on the left, Cancel / Save on the right (as in Figma) */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xl font-bold">{course?.course_name ?? "Loading..."}</p>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backHref)}
            disabled={isSaving}
            className="h-12 w-32 rounded-[10px] border-[#006c67] bg-transparent text-lg font-bold text-[#006c67] hover:bg-[#006c67]/10 hover:text-[#006c67]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || loadFailed}
            className="h-12 w-32 rounded-[10px] bg-[#006c67] text-lg font-bold text-white hover:bg-[#054a46]"
          >
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-6 rounded-3xl bg-neutral-100 p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="faq-title" className="text-lg font-bold">
            Title<span className="text-red-600">*</span>
          </label>
          <Input
            id="faq-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={isLoading || isSaving || loadFailed}
            className="bg-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="faq-description" className="text-lg font-bold">
            Description<span className="text-red-600">*</span>
          </label>
          <textarea
            id="faq-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={10}
            disabled={isLoading || isSaving || loadFailed}
            className="w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#006c67] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}