"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { announcementErrorMessage, type Announcement } from "@/lib/announcements"

type Course = {
  course_id: string
  course_name: string
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatAnnouncementDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(",", " ·")
}

function isNewAnnouncement(value: string) {
  const createdAt = new Date(value).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return !Number.isNaN(createdAt) && Date.now() - createdAt <= sevenDays && createdAt <= Date.now()
}

export default function AnnouncementBoard() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadAnnouncements() {
      try {
        setIsLoadingAnnouncements(true)
        const response = await fetch(
          `/api_announcement/read?course_id=${encodeURIComponent(courseId)}`,
          { signal: controller.signal },
        )
        const data: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(announcementErrorMessage(data, "Couldn't load announcements"))
        }
        if (!Array.isArray(data)) throw new Error("Invalid announcements response")
        setAnnouncements(data as Announcement[])
      } catch (error) {
        if (!controller.signal.aborted) {
          toast.error(error instanceof Error ? error.message : "Couldn't load announcements")
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingAnnouncements(false)
      }
    }

    void loadAnnouncements()
    return () => controller.abort()
  }, [courseId])

  useEffect(() => {
    async function loadCourse() {
      setIsLoading(true)
      try {
        const response = await fetch("/api_course/read")
        if (!response.ok) throw new Error("Couldn't load this course")

        const courses: Course[] = await response.json()
        setCourse(courses.find((item) => item.course_id === courseId) ?? null)
      } catch {
        toast.error("Couldn't load this course")
      } finally {
        setIsLoading(false)
      }
    }

    void loadCourse()
  }, [courseId])

  return (
    <div className="flex w-full flex-1 min-w-0 flex-col p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Announcements</h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">
            {course?.course_name ?? (isLoading ? "Loading..." : "Untitled course")}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => router.push(`/courses/${courseId}/announcement/create`)}
          className="h-auto shrink-0 gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover"
        >
          <Plus className="size-4" />
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-3xl bg-panel p-6 shadow-sm ring-1 ring-panel-border md:min-h-0 lg:p-8">
        <div className="flex flex-col gap-5">
          {isLoadingAnnouncements ? (
            <p className="px-2 text-sm text-panel-muted">Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p className="px-2 text-sm text-panel-muted">No announcements yet.</p>
          ) : (
            announcements.map((announcement) => (
              <article
                key={announcement.announcement_id}
                className="rounded-2xl bg-panel-surface px-6 py-5 text-panel-foreground transition hover:bg-panel-surface-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-panel-surface-strong text-xs font-bold text-brand-ink">
                      {getInitials(announcement.creator)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm font-semibold">{announcement.creator}</p>
                        <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-semibold leading-none text-brand-foreground">
                          Lecturer
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-panel-muted">
                        {formatAnnouncementDate(announcement.createdAt)}
                      </p>
                    </div>
                  </div>
                  {isNewAnnouncement(announcement.createdAt) && (
                    <span className="shrink-0 rounded-full bg-[#ff791f] px-2.5 py-1 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-base font-semibold leading-snug sm:text-lg">
                  {announcement.title}
                </h2>

                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-panel-muted">
                  {announcement.description || "—"}
                </p>

                <p className="mt-1 text-xs text-panel-muted underline underline-offset-2">
                  {announcement.comment_count}{" "}
                  {announcement.comment_count === 1 ? "comment" : "comments"}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
