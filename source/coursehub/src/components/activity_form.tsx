"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"


export type ActivityType = "Activities" | "Milestones"

const activityTypes: ActivityType[] = ["Activities", "Milestones"]

// Same look as the consultation log form.
const fieldLabel = "flex flex-col gap-2 text-sm font-medium uppercase tracking-wider text-panel-muted"
const fieldInput =
    "h-auto rounded-xl border-panel-border bg-panel-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-panel-foreground placeholder:text-panel-subtle focus-visible:border-panel-foreground focus-visible:ring-0 md:text-base"

export type Activity = {
    activity_id: number
    user_id: number
    course_id: string
    activity_name: string
    activity_type: ActivityType
    activity_description: string | null
    activity_date: string | null // "YYYY-MM-DD"
    activity_time: string | null
    createdAt: string
    creator_name: string
}

export type ActivityInput = {
    activity_name: string
    activity_type: ActivityType
    activity_description: string | null
    activity_date: string | null
}

export type Course = {
    course_id: string
    course_name: string
    role: string
}

export function canManageActivities(course: Course | null) {
    return course?.role === "lecturer" || course?.role === "ta"
}

export function formatDate(date: string | null) {
    if (!date) return "—"
    const [year, month, day] = date.split("-")
    return `${day}/${month}/${year}`
}

export function errorMessage(data: { detail?: unknown }, fallback: string) {
    if (typeof data.detail === "string") return data.detail
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return String(data.detail[0].msg)
    return fallback
}

export async function loadActivities(courseId: string) {
    const [activityRes, courseRes] = await Promise.all([
        fetch(`/api_activity/read?course_id=${encodeURIComponent(courseId)}`),
        fetch("/api_course/read"),
    ])

    const activityData = await activityRes.json()
    if (!activityRes.ok) throw new Error(errorMessage(activityData, "Failed to load activities"))

    let course: Course | null = null
    if (courseRes.ok) {
        const courses: Course[] = await courseRes.json()
        course = courses.find((c) => c.course_id === courseId) ?? null
    }

    return { activities: activityData as Activity[], course }
}

export function ActivityForm({
    initial,
    onCancel,
    onSave,
}: {
    initial?: Activity
    onCancel: () => void
    onSave: (input: ActivityInput) => Promise<void>
}) {
    const [name, setName] = useState(initial?.activity_name ?? "")
    const [type, setType] = useState<ActivityType | "">(initial?.activity_type ?? "")
    const [date, setDate] = useState(initial?.activity_date ?? "")
    const [description, setDescription] = useState(initial?.activity_description ?? "")
    const [isSaving, setIsSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handle_submit = async (event: FormEvent) => {
        event.preventDefault()
        if (!name.trim()) return setFormError("Title is required")
        if (!type) return setFormError("Type is required")

        setFormError(null)
        setIsSaving(true)
        try {
            await onSave({
                activity_name: name.trim(),
                activity_type: type,
                activity_description: description.trim() || null,
                activity_date: date || null,
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
            <form
                onSubmit={handle_submit}
                onClick={(event) => event.stopPropagation()}
                className="flex w-full max-w-2xl flex-col gap-6 rounded-3xl bg-panel p-6 shadow-lg ring-1 ring-black/10 lg:p-8"
            >
                <label className={fieldLabel}>
                    Title
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter Activities or Milestones Title"
                        className={fieldInput}
                    />
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className={fieldLabel}>
                        Type
                        <Combobox items={activityTypes} value={type || null} onValueChange={(value) => setType(value ?? "")}>
                            <ComboboxInput readOnly placeholder="Select type" className="h-auto w-full rounded-xl border-panel-border bg-panel-surface py-1.5 text-base font-normal normal-case tracking-normal text-panel-foreground [&_input]:placeholder:text-panel-subtle [&_svg]:text-panel-subtle" />
                            <ComboboxContent>
                                <ComboboxList>
                                    {(item: ActivityType) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </label>

                    <label className={fieldLabel}>
                        Date
                        <Input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className={`[color-scheme:dark] ${fieldInput}`}
                        />
                    </label>
                </div>

                <label className={fieldLabel}>
                    Detail
                    <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Write details"
                        className={`min-h-32 leading-7 ${fieldInput}`}
                    />
                </label>

                {formError && <p className="text-sm text-panel-danger">{formError}</p>}

                <div className="flex flex-row justify-end gap-3 border-t border-panel-border pt-6">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving} className="h-auto rounded-xl px-5 py-3 text-base font-semibold text-panel-muted hover:bg-panel-surface hover:text-panel-foreground">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving} className="h-auto rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand-ink shadow-sm hover:bg-white/90">
                        {isSaving && <Loader2 className="animate-spin" />}
                        Save
                    </Button>
                </div>
            </form>
        </div>
    )
}