"use client"

import { useRef, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { announcementErrorMessage } from "@/lib/announcements"

// Page: /courses/[id]/announcement/create
export default function AnnouncementForm() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const publishButtonRef = useRef<HTMLButtonElement>(null)
  const publishInFlight = useRef(false)

  const backHref = `/courses/${courseId}/announcement`

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (publishInFlight.current) return
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required")
      return
    }

    publishInFlight.current = true
    if (publishButtonRef.current) {
      publishButtonRef.current.disabled = true
    }
    setIsPublishing(true)
    try {
      const response = await fetch("/api_announcement/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          title: title.trim(),
          description: body.trim(),
        }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(announcementErrorMessage(data, "Couldn't publish this announcement"))
      }

      toast.success("Announcement published")
      router.push(backHref)
    } catch (error) {
      publishInFlight.current = false
      if (publishButtonRef.current) {
        publishButtonRef.current.disabled = false
      }
      setIsPublishing(false)
      toast.error(error instanceof Error ? error.message : "Couldn't publish this announcement")
    }
  }

  return (
    <div className="flex w-full flex-1 min-w-0 flex-col p-6 md:p-8">
      <form
        onSubmit={handlePublish}
        className="flex flex-1 flex-col rounded-[31px] bg-[#f4f4f4] p-6 md:p-8"
      >
        {/* Header: title on the left, Cancel / Publish on the right */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold underline underline-offset-4">Create Announcement</h1>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(backHref)}
              disabled={isPublishing}
              className="h-12 w-36 rounded-[10px] border-[#006c67] bg-transparent text-xl font-bold text-[#006c67] hover:bg-[#006c67]/10 hover:text-[#006c67]"
            >
              Cancel
            </Button>
            <Button
              ref={publishButtonRef}
              type="submit"
              disabled={isPublishing}
              className="h-12 w-36 rounded-[10px] bg-[#006c67] text-xl font-bold text-white hover:bg-[#054a46]"
            >
              {isPublishing && <Loader2 className="mr-2 size-4 animate-spin" />}
              Publish
            </Button>
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="announcement-title" className="text-2xl font-bold">
              Title<span className="text-red-600">*</span>
            </label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              disabled={isPublishing}
              className="h-14 rounded-[15px] border-black/40 bg-[#f4f4f4] text-lg"
            />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="announcement-body" className="text-2xl font-bold">
              Body<span className="text-red-600">*</span>
            </label>
            <textarea
              id="announcement-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body"
              disabled={isPublishing}
              className="min-h-[320px] w-full flex-1 resize-y rounded-[15px] border border-black/40 bg-[#f4f4f4] px-4 py-3 text-lg outline-none focus-visible:ring-2 focus-visible:ring-[#006c67] disabled:opacity-50"
            />
          </div>
        </div>
      </form>
    </div>
  )
}