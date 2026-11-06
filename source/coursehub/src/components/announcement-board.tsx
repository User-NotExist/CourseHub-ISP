"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  announcementErrorMessage,
  type Announcement,
  type AnnouncementComment,
} from "@/lib/announcements"
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

// function isNewAnnouncement(value: string) {
//   const createdAt = new Date(value).getTime()
//   const sevenDays = 7 * 24 * 60 * 60 * 1000
//   return !Number.isNaN(createdAt) && Date.now() - createdAt <= sevenDays && createdAt <= Date.now()
// }

function formatCommentDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(",", " ·")
}

export default function AnnouncementBoard() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true)
  const [expandedAnnouncementIds, setExpandedAnnouncementIds] = useState<number[]>([])
  const [commentsByAnnouncement, setCommentsByAnnouncement] = useState<Record<number, AnnouncementComment[]>>({})
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<number | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [submittingCommentFor, setSubmittingCommentFor] = useState<number | null>(null)
  const [editingAnnouncement, setEditingAnnouncement] = useState<{
    announcementId: number
    title: string
    description: string
  } | null>(null)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [editingComment, setEditingComment] = useState<{ announcementId: number; commentId: number } | null>(null)
  const [editingDraft, setEditingDraft] = useState("")
  const [savingComment, setSavingComment] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<{ announcementId: number; comment: AnnouncementComment } | null>(null)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null)
  const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false)

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

  async function toggleComments(announcementId: number) {
    if (expandedAnnouncementIds.includes(announcementId)) {
      setExpandedAnnouncementIds((current) => current.filter((id) => id !== announcementId))
      return
    }

    setExpandedAnnouncementIds((current) => [...current, announcementId])
    setLoadingCommentsFor(announcementId)
    try {
      const response = await fetch(
        `/api_announcement/comments?course_id=${encodeURIComponent(courseId)}&announcement_id=${announcementId}`,
      )
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(announcementErrorMessage(data, "Couldn't load comments"))
      }
      if (!Array.isArray(data)) throw new Error("Invalid comments response")
      const comments = data as AnnouncementComment[]
      setCommentsByAnnouncement((current) => ({ ...current, [announcementId]: comments }))
      setAnnouncements((current) =>
        current.map((item) =>
          item.announcement_id === announcementId ? { ...item, comment_count: comments.length } : item,
        ),
      )
    } catch (error) {
      setExpandedAnnouncementIds((current) => current.filter((id) => id !== announcementId))
      toast.error(error instanceof Error ? error.message : "Couldn't load comments")
    } finally {
      setLoadingCommentsFor(null)
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>, announcementId: number) {
    event.preventDefault()
    const comment = commentDrafts[announcementId]?.trim() ?? ""
    if (!comment || submittingCommentFor !== null) return

    setSubmittingCommentFor(announcementId)
    try {
      const response = await fetch("/api_announcement/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, announcement_id: announcementId, comment }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(announcementErrorMessage(data, "Couldn't submit comment"))

      const created = data as AnnouncementComment
      setCommentsByAnnouncement((current) => ({
        ...current,
        [announcementId]: [...(current[announcementId] ?? []), created],
      }))
      setAnnouncements((current) =>
        current.map((item) =>
          item.announcement_id === announcementId
            ? { ...item, comment_count: item.comment_count + 1 }
            : item,
        ),
      )
      setCommentDrafts((current) => ({ ...current, [announcementId]: "" }))
      toast.success("Comment added")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't submit comment")
    } finally {
      setSubmittingCommentFor(null)
    }
  }

  async function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingAnnouncement || !editingAnnouncement.title.trim() || savingAnnouncement) return

    setSavingAnnouncement(true)
    try {
      const response = await fetch("/api_announcement/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          announcement_id: editingAnnouncement.announcementId,
          title: editingAnnouncement.title.trim(),
          description: editingAnnouncement.description.trim(),
        }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(announcementErrorMessage(data, "Couldn't update this announcement"))
      }

      const updated = data as Announcement
      setAnnouncements((current) =>
        current.map((item) =>
          item.announcement_id === updated.announcement_id
            ? {
                ...item,
                title: updated.title,
                description: updated.description,
                updatedAt: updated.updatedAt,
              }
            : item,
        ),
      )
      setEditingAnnouncement(null)
      toast.success("Announcement updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update this announcement")
    } finally {
      setSavingAnnouncement(false)
    }
  }

  async function saveComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingComment || !editingDraft.trim() || savingComment) return

    setSavingComment(true)
    try {
      const response = await fetch(`/api_announcement/comments/${editingComment.commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          announcement_id: editingComment.announcementId,
          comment: editingDraft.trim(),
        }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(announcementErrorMessage(data, "Couldn't update comment"))

      const updated = data as AnnouncementComment
      setCommentsByAnnouncement((current) => ({
        ...current,
        [editingComment.announcementId]: (current[editingComment.announcementId] ?? []).map((comment) =>
          comment.comment_id === updated.comment_id ? updated : comment,
        ),
      }))
      setEditingComment(null)
      setEditingDraft("")
      toast.success("Comment updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update comment")
    } finally {
      setSavingComment(false)
    }
  }

  async function deleteComment() {
    if (!commentToDelete || isDeletingComment) return

    setIsDeletingComment(true)
    try {
      const { announcementId, comment } = commentToDelete
      const response = await fetch(`/api_announcement/comments/${comment.comment_id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, announcement_id: announcementId }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(announcementErrorMessage(data, "Couldn't delete comment"))

      setCommentsByAnnouncement((current) => ({
        ...current,
        [announcementId]: (current[announcementId] ?? []).filter(
          (item) => item.comment_id !== comment.comment_id,
        ),
      }))
      setAnnouncements((current) =>
        current.map((item) =>
          item.announcement_id === announcementId
            ? { ...item, comment_count: Math.max(0, item.comment_count - 1) }
            : item,
        ),
      )
      setCommentToDelete(null)
      toast.success("Comment deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete comment")
    } finally {
      setIsDeletingComment(false)
    }
  }

  async function deleteAnnouncement() {
    if (!announcementToDelete || isDeletingAnnouncement) return

    setIsDeletingAnnouncement(true)
    try {
      const response = await fetch("/api_announcement/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          announcement_id: announcementToDelete.announcement_id,
        }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(announcementErrorMessage(data, "Couldn't delete this announcement"))
      }

      setAnnouncements((current) =>
        current.filter((item) => item.announcement_id !== announcementToDelete.announcement_id),
      )
      setCommentsByAnnouncement((current) => {
        const next = { ...current }
        delete next[announcementToDelete.announcement_id]
        return next
      })
      setExpandedAnnouncementIds((current) =>
        current.filter((id) => id !== announcementToDelete.announcement_id),
      )
      setEditingAnnouncement((current) =>
        current?.announcementId === announcementToDelete.announcement_id ? null : current,
      )
      setAnnouncementToDelete(null)
      toast.success("Announcement deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete this announcement")
    } finally {
      setIsDeletingAnnouncement(false)
    }
  }

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
                        <span className="rounded-md bg-brand px-2 py-1.5 text-[10px] font-semibold leading-none text-brand-foreground">
                          Lecturer
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-panel-muted">
                        {formatAnnouncementDate(announcement.createdAt)}
                      </p>
                    </div>
                  </div>
                  {announcement.can_edit && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit announcement"
                        title="Edit announcement"
                        disabled={savingAnnouncement || editingAnnouncement !== null}
                        onClick={() =>
                          setEditingAnnouncement({
                            announcementId: announcement.announcement_id,
                            title: announcement.title,
                            description: announcement.description ?? "",
                          })
                        }
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete announcement"
                        title="Delete announcement"
                        onClick={() => setAnnouncementToDelete(announcement)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                  {/* {isNewAnnouncement(announcement.createdAt) && (
                    <span className="shrink-0 rounded-full bg-[#ff791f] px-2.5 py-1 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  )} */}
                </div>

                {editingAnnouncement?.announcementId === announcement.announcement_id ? (
                  <form onSubmit={saveAnnouncement} className="mt-3 flex flex-col gap-3">
                    <Input
                      autoFocus
                      value={editingAnnouncement.title}
                      onChange={(event) =>
                        setEditingAnnouncement((current) =>
                          current ? { ...current, title: event.target.value } : current,
                        )
                      }
                      aria-label="Announcement title"
                      disabled={savingAnnouncement}
                      className="bg-panel-surface text-base font-semibold"
                    />
                    <Textarea
                      value={editingAnnouncement.description}
                      onChange={(event) =>
                        setEditingAnnouncement((current) =>
                          current ? { ...current, description: event.target.value } : current,
                        )
                      }
                      aria-label="Announcement body"
                      disabled={savingAnnouncement}
                      className="min-h-24 resize-y bg-panel-surface text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={savingAnnouncement}
                        onClick={() => setEditingAnnouncement(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingAnnouncement || !editingAnnouncement.title.trim()}
                      >
                        {savingAnnouncement && <Loader2 className="size-3.5 animate-spin" />}
                        {savingAnnouncement ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2 className="mt-2 text-base font-semibold leading-snug sm:text-lg">
                      {announcement.title}
                    </h2>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-panel-muted">
                      {announcement.description || "—"}
                    </p>
                  </>
                )}

                <button
                  type="button"
                  aria-expanded={expandedAnnouncementIds.includes(announcement.announcement_id)}
                  onClick={() => void toggleComments(announcement.announcement_id)}
                  className="mt-2 flex items-center gap-1 text-left text-sm text-panel-muted hover:text-panel-foreground font-bold"
                >
                  <span className="underline underline-offset-2">
                    {announcement.comment_count}{" "}
                    {announcement.comment_count === 1 ? "comment" : "comments"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-3.5 transition-transform ${expandedAnnouncementIds.includes(announcement.announcement_id) ? "rotate-180" : ""}`}
                  />
                </button>

                {expandedAnnouncementIds.includes(announcement.announcement_id) && (
                  <section className="mt-3 border-t border-panel-border pt-3" aria-label="Comments">
                    <h3 className="mb-2 text-sm font-semibold text-panel-foreground">
                      Comments ({announcement.comment_count})
                    </h3>
                    {loadingCommentsFor === announcement.announcement_id ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-panel-muted">
                        <Loader2 className="size-4 animate-spin" />
                        Loading comments...
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {(commentsByAnnouncement[announcement.announcement_id] ?? []).map((comment) => (
                          <article
                            key={comment.comment_id}
                            className="px-3 py-2.5"
                          >
                            {editingComment?.announcementId === announcement.announcement_id &&
                            editingComment.commentId === comment.comment_id ? (
                              <form onSubmit={saveComment} className="flex flex-col gap-2">
                                <Input
                                  autoFocus
                                  value={editingDraft}
                                  onChange={(event) => setEditingDraft(event.target.value)}
                                  maxLength={2000}
                                  aria-label="Edit comment"
                                  disabled={savingComment}
                                  className="h-9 bg-panel-surface text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={savingComment}
                                    onClick={() => setEditingComment(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit" size="sm" disabled={savingComment || !editingDraft.trim()}>
                                    {savingComment && <Loader2 className="size-3.5 animate-spin" />}
                                    Save
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-start gap-2">
                                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-panel text-[10px] font-bold text-brand-ink">
                                    {getInitials(comment.creator)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="text-xs font-semibold text-panel-foreground">
                                        {comment.creator}
                                      </span>
                                      <span className="text-[10px] text-panel-muted">
                                        {formatCommentDate(comment.createdAt)}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-panel-muted">
                                      {comment.comment}
                                    </p>
                                  </div>
                                  {(comment.can_edit || comment.can_delete) && (
                                    <div className="flex shrink-0 gap-1">
                                      {comment.can_edit && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          aria-label="Edit comment"
                                          onClick={() => {
                                            setEditingComment({
                                              announcementId: announcement.announcement_id,
                                              commentId: comment.comment_id,
                                            })
                                            setEditingDraft(comment.comment)
                                          }}
                                        >
                                          <Pencil />
                                        </Button>
                                      )}
                                      {comment.can_delete && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          aria-label="Delete comment"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() =>
                                            setCommentToDelete({
                                              announcementId: announcement.announcement_id,
                                              comment,
                                            })
                                          }
                                        >
                                          <Trash2 />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </article>
                        ))}
                        {commentsByAnnouncement[announcement.announcement_id]?.length === 0 && (
                          <p className="px-1 py-1 text-xs text-panel-muted">No comments yet.</p>
                        )}
                      </div>
                    )}

                    <form
                      onSubmit={(event) => void submitComment(event, announcement.announcement_id)}
                      className="mt-2 flex items-center gap-2"
                    >
                      <Input
                        value={commentDrafts[announcement.announcement_id] ?? ""}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [announcement.announcement_id]: event.target.value,
                          }))
                        }
                        placeholder="Write a comment..."
                        aria-label="Write a comment"
                        maxLength={2000}
                        disabled={submittingCommentFor === announcement.announcement_id}
                        className="h-10 min-w-0 bg-panel-surface text-sm"
                      />
                      <Button
                        type="submit"
                        disabled={
                          submittingCommentFor === announcement.announcement_id ||
                          !(commentDrafts[announcement.announcement_id] ?? "").trim()
                        }
                        className="h-10 shrink-0 gap-1.5"
                      >
                        {submittingCommentFor === announcement.announcement_id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        <span className="hidden sm:inline">Submit</span>
                      </Button>
                    </form>
                  </section>
                )}
              </article>
            ))
          )}
        </div>
      </div>

      <AlertDialog
        open={announcementToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingAnnouncement) setAnnouncementToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{announcementToDelete?.title}&quot; and its comments.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAnnouncement}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingAnnouncement}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void deleteAnnouncement()
              }}
            >
              {isDeletingAnnouncement && <Loader2 className="size-4 animate-spin" />}
              {isDeletingAnnouncement ? "Deleting..." : "Delete announcement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={commentToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingComment) setCommentToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This comment will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingComment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingComment}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void deleteComment()
              }}
            >
              {isDeletingComment && <Loader2 className="size-4 animate-spin" />}
              {isDeletingComment ? "Deleting..." : "Delete comment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
