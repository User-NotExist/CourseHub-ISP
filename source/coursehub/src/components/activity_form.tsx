"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"


export type ActivityType = "Activities" | "Milestones"

const activityTypes: ActivityType[] = ["Activities", "Milestones"]

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
                className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-[#E8F1F0] p-6"
            >
                <label className="flex flex-col gap-1 font-bold">
                    Title
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter Activities or Milestones Title"
                        className="bg-white font-normal"
                    />
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1 font-bold">
                        Type
                        <Combobox items={activityTypes} value={type || null} onValueChange={(value) => setType(value ?? "")}>
                            <ComboboxInput readOnly placeholder="Select type" className="w-full bg-white font-normal" />
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

                    <label className="flex flex-col gap-1 font-bold">
                        Date
                        <Input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className="bg-white font-normal"
                        />
                    </label>
                </div>

                <label className="flex flex-col gap-1 font-bold">
                    Detail
                    <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Write details"
                        className="min-h-32 bg-white font-normal"
                    />
                </label>

                {formError && <p className="text-sm font-bold text-red-600">{formError}</p>}

                <div className="flex flex-row gap-3">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving} className="bg-[#054A46] text-white hover:bg-[#054A46]/90">
                        {isSaving && <Loader2 className="animate-spin" />}
                        Save
                    </Button>
                </div>
            </form>
        </div>
    )
}