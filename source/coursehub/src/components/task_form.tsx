"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

type TaskStatus = "To-Do" | "In-Progress" | "Done"
type Assignee = { task_assignee_gmail: string; status: TaskStatus }
type TaskDetails = {
    task_name: string
    task_description: string
    task_due_date: string // "YYYY-MM-DD", or "" when there is no due date
    task_assignee: Assignee[]
}
type Member = { email: string; name: string; role: string }

const EMPTY_TASK: TaskDetails = { task_name: "", task_description: "", task_due_date: "", task_assignee: [] }

export default function TaskForm({ mode }: { mode: "create" | "edit" }) {
    const { id: courseId, taskId } = useParams<{ id: string; taskId?: string }>()
    const router = useRouter()
    const isEdit = mode === "edit"
    const tasksUrl = `/courses/${courseId}/task`

    const [task, setTask] = useState<TaskDetails | null>(isEdit ? null : EMPTY_TASK)
    const [original, setOriginal] = useState(isEdit ? "" : JSON.stringify(EMPTY_TASK))
    const [members, setMembers] = useState<Member[] | null>(null)
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)
    const [saving, setSaving] = useState(false)
    const [email, setEmail] = useState("")
    const [removing, setRemoving] = useState<Assignee | null>(null)
    const [leaving, setLeaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const dirty = !!task && JSON.stringify(task) !== original
    const validDetails = !!task?.task_name.trim()

    useEffect(() => {
        const controller = new AbortController()
        async function load() {
            try {
                const [membersResponse, taskResponse] = await Promise.all([
                    fetch(`/api_course/edit?course_id=${encodeURIComponent(courseId)}`, { signal: controller.signal }),
                    isEdit
                        ? fetch(`/api_task/edit?course_id=${encodeURIComponent(courseId)}&task_id=${encodeURIComponent(taskId ?? "")}`, { signal: controller.signal })
                        : Promise.resolve(null),
                ])
                // The member list is only a convenience (suggestions + validation), so a failure here is ignored.
                // Note: /api_course/edit is lecturer-only, so TAs won't get suggestions.
                if (membersResponse.ok) {
                    const data = await membersResponse.json()
                    setMembers(data.members)
                }
                if (taskResponse) {
                    const data = await taskResponse.json()
                    if (!taskResponse.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Unable to load this task")
                    const loaded: TaskDetails = {
                        task_name: data.task_name,
                        task_description: data.task_description ?? "",
                        task_due_date: data.task_due_date === "None" || !data.task_due_date ? "" : data.task_due_date,
                        task_assignee: data.tasks ?? [],
                    }
                    setTask(loaded)
                    setOriginal(JSON.stringify(loaded))
                }
            } catch (err) {
                if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load this task")
            }
        }
        void load()
        return () => controller.abort()
    }, [courseId, taskId, isEdit, reload])

    useEffect(() => {
        if (!dirty) return
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [dirty])

    function addAssignee(event: FormEvent) {
        event.preventDefault()
        if (!task) return
        const normalized = email.trim().toLowerCase()
        if (task.task_assignee.some((assignee) => assignee.task_assignee_gmail.toLowerCase() === normalized)) {
            toast.error("This user is already assigned")
            return
        }
        if (members && !members.some((member) => member.email.toLowerCase() === normalized)) {
            toast.error("This user is not a member of this course")
            return
        }
        // New assignees start as To-Do. Existing assignees keep their current status.
        setTask({ ...task, task_assignee: [...task.task_assignee, { task_assignee_gmail: normalized, status: "To-Do" }] })
        setEmail("")
    }

    async function save(event: FormEvent) {
        event.preventDefault()
        if (!task || saving) return
        if (!task.task_name.trim()) { toast.error("Task name is required"); return }
        setSaving(true)
        try {
            const response = await fetch(isEdit ? "/api_task/edit" : "/api_task/create", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: courseId,
                    ...(isEdit ? { task_id: taskId } : {}),
                    task_name: task.task_name.trim(),
                    task_description: task.task_description.trim() || null,
                    task_due_date: task.task_due_date || null,
                    task_assignee: task.task_assignee,
                }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Unable to save the task. Please try again.")
            toast.success(isEdit ? "Task updated successfully" : "Task created successfully")
            setOriginal(JSON.stringify(task))
            router.push(tasksUrl)
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Unable to save the task")
        } finally { setSaving(false) }
    }

    async function deleteTask() {
        if (!isEdit || !taskId || deleting) return

        setDeleting(true)

        try {
            const response = await fetch("/api_task/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: courseId,
                    task_id: taskId,
                }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Unable to delete the task. Please try again."
                )
            }

            toast.success("Task deleted successfully")
            router.push(tasksUrl)
            router.refresh()
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Unable to delete the task"
            )
        } finally {
            setDeleting(false)
        }
    }

    if (error) return <div className="mx-auto w-full max-w-3xl p-8"><p role="alert" className="mb-4 text-destructive">{error}</p><Button onClick={() => { setError(""); setReload((value) => value + 1) }}>Try again</Button><Button variant="ghost" onClick={() => router.push(tasksUrl)}>Back to tasks</Button></div>
    if (!task) return <div role="status" className="flex min-h-64 items-center gap-2"><Loader2 className="size-5 animate-spin" />Loading task…</div>

    const back = () => dirty ? setLeaving(true) : router.push(tasksUrl)
    const nameFor = (assigneeEmail: string) => members?.find((member) => member.email.toLowerCase() === assigneeEmail.toLowerCase())?.name ?? ""

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
            <Button variant="ghost" onClick={back} disabled={saving}><ArrowLeft />Back to tasks</Button>
            <header>
                <h1 className="text-3xl font-bold">{isEdit ? "Edit task" : "Create task"}</h1>
                <p className="mt-2 text-muted-foreground">{isEdit ? "Update the task details and who it is assigned to." : "Add the task details and choose who it is assigned to."}</p>
            </header>
            <form id="task-details" onSubmit={save}>
                <Card>
                    <CardHeader><CardTitle>Task details</CardTitle><CardDescription>Help assignees understand what needs to be done.</CardDescription></CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2"><label htmlFor="task-name" className="font-medium">Task name</label><Input id="task-name" required value={task.task_name} disabled={saving} onChange={(event) => setTask({ ...task, task_name: event.target.value })} placeholder="e.g. Prepare Lab 3 slides" /></div>
                        <div className="space-y-2"><label htmlFor="task-description" className="font-medium">Task description</label><Textarea id="task-description" rows={4} value={task.task_description} disabled={saving} onChange={(event) => setTask({ ...task, task_description: event.target.value })} placeholder="What needs to be done…" /></div>
                        <div className="space-y-2"><label htmlFor="task-due-date" className="font-medium">Due date</label><Input id="task-due-date" type="date" value={task.task_due_date} disabled={saving} onChange={(event) => setTask({ ...task, task_due_date: event.target.value })} className="sm:w-48" /></div>
                    </CardContent>
                </Card>
            </form>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" />Assigned users ({task.task_assignee.length})</CardTitle><CardDescription>Assigned users can move this task between columns. Changes take effect when you save.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={addAssignee} className="space-y-2">
                        <label htmlFor="assignee-email" className="font-medium">Assign a user</label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input id="assignee-email" type="email" required list="course-member-emails" placeholder="user@ku.th" value={email} disabled={saving} onChange={(event) => setEmail(event.target.value)} className="flex-1" aria-describedby="assignee-hint" />
                            <datalist id="course-member-emails">{members?.map((member) => <option key={member.email} value={member.email}>{member.name}</option>)}</datalist>
                            <Button type="submit" variant="outline" disabled={saving || !email.trim()}><Plus />Assign user</Button>
                        </div>
                        <p id="assignee-hint" className="text-xs text-muted-foreground">Use the email of a member of this course.</p>
                    </form>
                    {task.task_assignee.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No one is assigned yet.</p>
                    ) : (
                        <ul className="divide-y rounded-lg border px-4">
                            {task.task_assignee.map((assignee) => (
                                <li key={assignee.task_assignee_gmail} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1"><p className="break-words font-medium">{nameFor(assignee.task_assignee_gmail) || assignee.task_assignee_gmail}</p>{nameFor(assignee.task_assignee_gmail) && <p className="break-all text-sm text-muted-foreground">{assignee.task_assignee_gmail}</p>}</div>
                                    <Button variant="ghost" size="icon" aria-label={`Remove ${assignee.task_assignee_gmail}`} disabled={saving} onClick={() => setRemoving(assignee)}><Trash2 className="size-4 text-destructive" /></Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
            {isEdit && (
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Permanently delete this task. This action cannot be undone.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-medium">Delete this task</p>
                            <p className="text-sm text-muted-foreground">
                                All data associated with this task will be deleted.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="destructive"
                            disabled={saving || deleting}
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2 className="size-4" />
                            Delete task
                        </Button>
                    </CardContent>
                </Card>
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
                <p role="status" className="mr-auto text-sm text-muted-foreground">{dirty ? "You have unsaved changes" : isEdit ? "All changes saved" : ""}</p>
                <Button variant="outline" onClick={back} disabled={saving}>Cancel</Button>
                <Button form="task-details" type="submit" disabled={saving || !validDetails || (isEdit && !dirty)}>{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "Saving…" : isEdit ? "Save" : "Confirm"}</Button>
            </div>
            {isEdit && (
                <AlertDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete this task?
                            </AlertDialogTitle>

                            <AlertDialogDescription>
                                This will permanently delete &quot;{task.task_name}&quot;.
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>
                                Cancel
                            </AlertDialogCancel>

                            <AlertDialogAction
                                variant="destructive"
                                disabled={deleting}
                                onClick={(event) => {
                                    event.preventDefault()
                                    void deleteTask()
                                }}
                            >
                                {deleting && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}
                                {deleting ? "Deleting…" : "Delete task"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove assigned user?</AlertDialogTitle><AlertDialogDescription>{removing?.task_assignee_gmail} will no longer be assigned to this task when you save.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { setTask({ ...task, task_assignee: task.task_assignee.filter((assignee) => assignee.task_assignee_gmail !== removing?.task_assignee_gmail) }); setRemoving(null) }}>Remove user</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={leaving} onOpenChange={setLeaving}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle><AlertDialogDescription>Your task changes have not been saved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => router.push(tasksUrl)}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </main>
    )
}
