"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type TaskDetails = {
  task_name: string
  task_description: string | null
  task_due_date: string | null
}

export default function EditTaskPage() {
  const { id: courseId, taskId } = useParams<{ id: string; taskId: string }>()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTask() {
      try {
        const query = new URLSearchParams({ course_id: courseId, task_id: taskId })
        const response = await fetch(`/api_task/edit?${query}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail ?? "Unable to load task")
        }

        const task = data as TaskDetails
        setTitle(task.task_name)
        setDescription(task.task_description ?? "")
        setDueDate(task.task_due_date === "None" ? "" : task.task_due_date ?? "")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load task"
        setLoadError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadTask()
  }, [courseId, taskId])

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      const response = await fetch("/api_task/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          task_id: taskId,
          task_name: title,
          task_description: description,
          task_due_date: dueDate || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to save task")
      }

      toast.success("Task updated")
      router.push(`/courses/${courseId}/task`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save task")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="w-full flex-1 min-w-0 p-6 md:p-10">
      <h1 className="mb-6 text-3xl font-bold text-[#054a46] underline underline-offset-4">
        Edit task
      </h1>
      {isLoading ? (
        <p>Loading task...</p>
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <form onSubmit={saveTask} className="flex max-w-2xl flex-col gap-5">
          <label className="flex flex-col gap-2 font-semibold">
            Title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 font-semibold">
            Description
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 font-semibold">
            Due date
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/courses/${courseId}/task`)}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
