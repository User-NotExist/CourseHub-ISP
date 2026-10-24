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

// ASSUMPTION: same API shape as faq-board.tsx. Adjust to your real faq.py.
type ApiFaq = {
  faq_id: number
  faq_title: string
  faq_description: string | null
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
          // ASSUMPTION: reuse the list endpoint and pick the FAQ by id,
          // so no extra "read one" route is required.
          const faqsRes = await fetch(`/api_faq/read?course_id=${encodeURIComponent(courseId)}`)
          if (!faqsRes.ok) throw new Error()
          const faqs: ApiFaq[] = await faqsRes.json()
          const current = faqs.find((item) => String(item.faq_id) === faqId)
          if (!current) throw new Error("not found")
          setTitle(current.faq_title)
          setDescription(current.faq_description ?? "")
        }
      } catch {
        toast.error("Couldn't load this FAQ")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [courseId, faqId])

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
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const detail =
          typeof errorData === "object" &&
          errorData !== null &&
          "detail" in errorData &&
          typeof errorData.detail === "string"
            ? errorData.detail
            : "Couldn't save this FAQ"
        throw new Error(detail)
      }
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
            disabled={isSaving || isLoading}
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
            disabled={isLoading || isSaving}
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
            disabled={isLoading || isSaving}
            className="w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#006c67] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}