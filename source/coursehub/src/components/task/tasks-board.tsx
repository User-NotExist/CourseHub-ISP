"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Edit, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useParams, useRouter } from "next/navigation"

type TaskStatus = "todo" | "in_progress" | "done"

type Task = {
  task_id: string
  title: string
  description: string
  due_date: string | null
  status: TaskStatus
  assignees: { email: string; status: TaskStatus }[]
  my_assignee: string | null // current user's email if they are assigned
  // Backend only gives the owner's id, so for other people's tasks we assume
  // the first assignee is the owner (the create form puts the creator first).
  owner_email: string | null
  can_edit: boolean
  can_update_status: boolean
}

type Course = {
  course_id: string
  course_name: string
  role?: string
  can_edit?: boolean
}

type ApiTask = {
  task_id: number
  task_owner_id: number
  task_name: string
  task_description: string | null
  task_due_date: string | null
  tasks: { task_assignee_gmail: string; status: string }[] | null
  can_edit: boolean
}

type CurrentUser = {
  user_id: number
  email: string
}

function normalizeStatus(status: string | undefined): TaskStatus {
  switch (status) {
    case "In-Progress":
      return "in_progress"
    case "Done":
      return "done"
    default:
      return "todo"
  }
}

function toApiStatus(status: TaskStatus): string {
  switch (status) {
    case "in_progress":
      return "In-Progress"
    case "done":
      return "Done"
    default:
      return "To-Do"
  }
}

const STATUS_CONFIG: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To-do" },
  { key: "in_progress", label: "In-Progress" },
  { key: "done", label: "Done" },
]

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"]

// Moves a task one column left/right, or jumps to the first/last column.
function moveStatus(
  current: TaskStatus,
  direction: "left" | "right" | "leftmost" | "rightmost"
): TaskStatus {
  if (direction === "leftmost") return STATUS_ORDER[0]
  if (direction === "rightmost") return STATUS_ORDER[STATUS_ORDER.length - 1]
  const idx = STATUS_ORDER.indexOf(current)
  const delta = direction === "left" ? -1 : 1
  const nextIdx = Math.min(Math.max(idx + delta, 0), STATUS_ORDER.length - 1)
  return STATUS_ORDER[nextIdx]
}

export default function TasksBoard() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [coursesRes, tasksRes, userRes] = await Promise.all([
          fetch("/api_course/read"),
          fetch(`/api_task/read?course_id=${encodeURIComponent(courseId)}`),
          fetch("/api_auth/me"),
        ])
        if (!coursesRes.ok || !tasksRes.ok || !userRes.ok) {
          throw new Error("Failed to load course tasks")
        }

        const [courses, apiTasks, user]: [Course[], ApiTask[], CurrentUser] = await Promise.all([
          coursesRes.json(),
          tasksRes.json(),
          userRes.json(),
        ])
        const currentCourse = courses.find((item) => item.course_id === courseId) ?? null
        setCourse(currentCourse)
        // One card per task (not one per assignee).
        setTasks(apiTasks.map<Task>((task) => {
          const assignees = (task.tasks ?? []).map((assignment) => ({
            email: assignment.task_assignee_gmail,
            status: normalizeStatus(assignment.status),
          }))
          const mine = assignees.find((assignee) => assignee.email.toLowerCase() === user.email.toLowerCase())
          // Column: my own status if assigned, otherwise the least-progressed assignee.
          const status = mine?.status ?? (assignees.length
            ? STATUS_ORDER[Math.min(...assignees.map((assignee) => STATUS_ORDER.indexOf(assignee.status)))]
            : "todo")
          return {
            task_id: String(task.task_id),
            title: task.task_name,
            description: task.task_description ?? "",
            due_date: task.task_due_date === "None" ? null : task.task_due_date,
            status,
            assignees,
            my_assignee: mine?.email ?? null,
            owner_email: task.task_owner_id === user.user_id ? user.email : (assignees[0]?.email ?? null),
            can_edit: task.can_edit,
            can_update_status: !!mine || (task.can_edit && assignees.length > 0),
          }
        }))
      } catch {
        toast.error("Couldn't load this course's tasks")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [courseId])

  // Assigned user moves only their own status; owner/lecturer (not assigned) moves everyone.
  async function updateTaskStatus(target: Task, status: TaskStatus) {
    const emails = target.my_assignee ? [target.my_assignee] : target.assignees.map((assignee) => assignee.email)
    if (emails.length === 0) return
    const prev = tasks
    setTasks((current) => current.map((task) => (
      task.task_id === target.task_id
        ? {
            ...task,
            status,
            assignees: task.assignees.map((assignee) => (emails.includes(assignee.email) ? { ...assignee, status } : assignee)),
          }
        : task
    )))
    try {
      const results = await Promise.all(emails.map((email) => fetch("/api_task/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          task_id: target.task_id,
          task_assignee_gmail: email,
          status: toApiStatus(status),
        }),
      })))
      if (results.some((res) => !res.ok)) throw new Error()
    } catch {
      setTasks(prev) // roll back on failure
      toast.error("Couldn't update task status")
    }
  }

  return (
    <div className="flex w-full flex-1 min-w-0 flex-col p-6 md:p-10 overflow-y-auto md:overflow-hidden h-screen scrollbar-none">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
            Course Tasks
          </h1>
          <p className="mt-2 text-lg font-semibold text-neutral-900">
            {course?.course_name ?? (isLoading ? "Loading..." : "Untitled course")}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => router.push(`/courses/${courseId}/task/create`)}
          className="h-auto shrink-0 gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Plus className="size-4" />
          Create Task
        </Button>
      </div>

      {/* Board */}
      <div className="grid flex-1 grid-cols-1 gap-6 md:min-h-0 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)]">
        {STATUS_CONFIG.map(({ key, label }) => {
          const columnTasks = tasks.filter((t) => t.status === key)
          return (
            <div
              key={key}
              className="bg-panel rounded-3xl p-5 flex flex-col gap-4 min-h-0 shadow-sm ring-1 ring-panel-border"
            >
              <h2 className="text-panel-foreground text-xl font-semibold bg-panel-surface-strong rounded-2xl px-5 py-2.5 w-fit">
                {label}
              </h2>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-none">
                {isLoading ? (
                  <p className="text-panel-muted text-sm">Loading...</p>
                ) : columnTasks.length === 0 ? (
                  <p className="text-panel-muted text-sm">No tasks here yet.</p>
                ) : (
                  columnTasks.map((task) => (
                    <div key={task.task_id} className="bg-panel-surface rounded-2xl p-4 flex flex-col gap-2 transition hover:bg-panel-surface-strong">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-panel-foreground font-semibold">{task.title}</h3>
                        {task.can_edit && (
                          <Link
                            href={`/courses/${courseId}/task/${task.task_id}/edit`}
                            className="bg-brand rounded-md p-1.5 shadow-sm hover:bg-brand-hover transition"
                            aria-label="Edit task"
                          >
                            <Edit className="size-4 text-brand-foreground" />
                          </Link>
                        )}
                      </div>
                      <p className="text-panel-muted text-sm">{task.description}</p>
                      <div className="text-sm text-panel-muted space-y-0.5">
                        <p>
                          <span className="font-semibold text-panel-foreground">Owner: </span>
                          {task.owner_email ?? "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-panel-foreground">Assignee: </span>
                          {task.assignees
                            .filter((assignee) => assignee.email.toLowerCase() !== task.owner_email?.toLowerCase())
                            .map((assignee) => assignee.email)
                            .join(", ") || "None"}
                        </p>
                      </div>
                      <p className="text-panel-foreground text-sm font-semibold">
                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                      </p>

                      {/* Move between columns */}
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => updateTaskStatus(task, moveStatus(key, "leftmost"))}
                          disabled={key === "todo" || !task.can_update_status}
                          className="text-panel-muted hover:text-panel-foreground disabled:opacity-30"
                          aria-label="Move to first column"
                        >
                          <ChevronsLeft className="size-5" />
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task, moveStatus(key, "left"))}
                          disabled={key === "todo" || !task.can_update_status}
                          className="text-panel-muted hover:text-panel-foreground disabled:opacity-30"
                          aria-label="Move left"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => updateTaskStatus(task, moveStatus(key, "right"))}
                          disabled={key === "done" || !task.can_update_status}
                          className="text-panel-muted hover:text-panel-foreground disabled:opacity-30"
                          aria-label="Move right"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task, moveStatus(key, "rightmost"))}
                          disabled={key === "done" || !task.can_update_status}
                          className="text-panel-muted hover:text-panel-foreground disabled:opacity-30"
                          aria-label="Move to last column"
                        >
                          <ChevronsRight className="size-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}