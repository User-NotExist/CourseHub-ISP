"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const DESCRIPTION_MAX_LENGTH = 70

const roles = ["lecturer", "ta"] as const
type Role = typeof roles[number]
const roleLabels: Record<Role, string> = { lecturer: "Lecturer", ta: "TA"}
type Member = { email: string; name: string; role: Role }
type Course = { course_name: string; course_description: string | null; members: Member[] }

function RolePicker({ value, onChange, label, disabled }: {
    value: Role; onChange: (role: Role) => void; label: string; disabled?: boolean
}) {
    return (
        <Combobox items={roles} value={value} onValueChange={(role) => role && onChange(role)} itemToStringLabel={(role) => roleLabels[role]} disabled={disabled}>
            <ComboboxInput aria-label={label} readOnly className="w-full sm:w-36" />
            <ComboboxContent>
                <ComboboxList>{(role: Role) => <ComboboxItem key={role} value={role}>{roleLabels[role]}</ComboboxItem>}</ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

export default function EditCoursePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [course, setCourse] = useState<Course | null>(null)
    const [original, setOriginal] = useState("")
    const [error, setError] = useState("")
    const [reload, setReload] = useState(0)
    const [saving, setSaving] = useState(false)
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<Role>("ta")
    const [removing, setRemoving] = useState<Member | null>(null)
    const [leaving, setLeaving] = useState(false)
    const dirty = !!course && JSON.stringify(course) !== original
    const description = course?.course_description ?? ""
    const validDetails = !!course?.course_name.trim() && !!description.trim() && description.length <= DESCRIPTION_MAX_LENGTH

    useEffect(() => {
        const controller = new AbortController()
        async function load() {
            try {
                const response = await fetch(`/api_course/edit?course_id=${encodeURIComponent(id)}`, { signal: controller.signal })
                const data = await response.json()
                if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Unable to load this course")
                const loaded = { course_name: data.course_name, course_description: data.course_description ?? "", members: data.members }
                setCourse(loaded)
                setOriginal(JSON.stringify(loaded))
            } catch (err) {
                if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load this course")
            }
        }
        void load()
        return () => controller.abort()
    }, [id, reload])

    useEffect(() => {
        if (!dirty) return
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [dirty])

    function addMember(event: FormEvent) {
        event.preventDefault()
        if (!course) return
        const normalized = email.trim().toLowerCase()
        if (course.members.some((member) => member.email.toLowerCase() === normalized)) {
            toast.error("This user is already in the course")
            return
        }
        setCourse({ ...course, members: [...course.members, { email: normalized, name: "", role }] })
        setEmail("")
    }

    async function save(event: FormEvent) {
        event.preventDefault()
        if (!course || saving) return
        if (!course.course_name.trim()) { toast.error("Course name is required"); return }
        if (!description.trim()) { toast.error("Description is required"); return }
        if (description.length > DESCRIPTION_MAX_LENGTH) { toast.error(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`); return }
        if (!course.members.some((member) => member.role === "lecturer")) { toast.error("Keep at least one lecturer in the course"); return }
        setSaving(true)
        try {
            const response = await fetch("/api_course/edit", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course_id: id, ...course, course_name: course.course_name.trim(), course_description: description.trim() }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Unable to save changes. Please try again.")
            toast.success("Course updated successfully")
            setOriginal(JSON.stringify(course))
            router.push("/courses")
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Unable to save changes")
        } finally { setSaving(false) }
    }

    if (error) return <div className="mx-auto w-full max-w-3xl p-8"><p role="alert" className="mb-4 text-destructive">{error}</p><Button onClick={() => { setError(""); setReload((value) => value + 1) }}>Try again</Button><Button variant="ghost" onClick={() => router.push("/courses")}>Back to courses</Button></div>
    if (!course) return <div role="status" className="flex min-h-64 items-center gap-2"><Loader2 className="size-5 animate-spin" />Loading course…</div>

    const lastLecturer = (member: Member) => member.role === "lecturer" && course.members.filter((item) => item.role === "lecturer").length === 1
    const back = () => dirty ? setLeaving(true) : router.push("/courses")

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
            <Button variant="ghost" onClick={back} disabled={saving}><ArrowLeft />Back to courses</Button>
            <header><h1 className="text-3xl font-bold">Edit course</h1><p className="mt-2 text-muted-foreground">Update course details and manage who has access.</p></header>
            <form id="course-details" onSubmit={save}>
                <Card>
                    <CardHeader><CardTitle>Course details</CardTitle><CardDescription>Help members identify the courses.</CardDescription></CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2"><label htmlFor="course-name" className="font-medium">Course name</label><Input id="course-name" required value={course.course_name} disabled={saving} onChange={(event) => setCourse({ ...course, course_name: event.target.value })} /></div>
                        <div className="space-y-2">
                            <label htmlFor="course-description" className="font-medium">Description</label>
                            <Textarea
                                id="course-description"
                                required
                                maxLength={DESCRIPTION_MAX_LENGTH}
                                rows={4}
                                value={description}
                                disabled={saving}
                                aria-describedby="description-count"
                                onChange={(event) => setCourse({ ...course, course_description: event.target.value })}
                                placeholder="Describe the course…"
                            />
                            <p id="description-count" className={`text-right text-xs ${description.length > DESCRIPTION_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                                {description.length}/{DESCRIPTION_MAX_LENGTH} characters
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </form>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" />Course members ({course.members.length})</CardTitle><CardDescription>Lecturers can add members, change roles, and remove access. Keep at least one lecturer.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={addMember} className="space-y-2">
                        <label htmlFor="member-email" className="font-medium">Add a member</label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input id="member-email" type="email" required placeholder="user@ku.th" value={email} disabled={saving} onChange={(event) => setEmail(event.target.value)} className="flex-1" aria-describedby="member-hint" />
                            <RolePicker value={role} onChange={setRole} label="New member role" disabled={saving} />
                            <Button type="submit" variant="outline" disabled={saving || !email.trim()}><Plus />Add member</Button>
                        </div>
                        <p id="member-hint" className="text-xs text-muted-foreground">Use the email of a registered CourseHub user. Changes take effect when you save.</p>
                    </form>
                    <ul className="divide-y rounded-lg border px-4">
                        {course.members.map((member) => (
                            <li key={member.email} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1"><p className="break-words font-medium">{member.name || member.email}</p>{member.name && <p className="break-all text-sm text-muted-foreground">{member.email}</p>}{lastLecturer(member) && <p className="text-xs text-muted-foreground">Last lecturer</p>}</div>
                                <div className="flex items-center gap-2">
                                    <RolePicker value={member.role} label={`Role for ${member.email}`} disabled={saving || lastLecturer(member)} onChange={(newRole) => setCourse({ ...course, members: course.members.map((item) => item.email === member.email ? { ...item, role: newRole } : item) })} />
                                    <Button variant="ghost" size="icon" aria-label={`Remove ${member.email}`} disabled={saving || lastLecturer(member)} onClick={() => setRemoving(member)}><Trash2 className="size-4 text-destructive" /></Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            <div className="flex flex-wrap items-center justify-end gap-3"><p role="status" className="mr-auto text-sm text-muted-foreground">{dirty ? "You have unsaved changes" : "All changes saved"}</p><Button variant="outline" onClick={back} disabled={saving}>Cancel</Button><Button form="course-details" type="submit" disabled={saving || !dirty || !validDetails}>{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "Saving…" : "Save changes"}</Button></div>
            <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove member?</AlertDialogTitle><AlertDialogDescription>{removing?.email} will lose access to this course when you save changes.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { setCourse({ ...course, members: course.members.filter((member) => member.email !== removing?.email) }); setRemoving(null) }}>Remove member</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={leaving} onOpenChange={setLeaving}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle><AlertDialogDescription>Your course and member changes have not been saved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => router.push("/courses")}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </main>
    )
}
