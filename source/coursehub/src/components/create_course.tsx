"use client"

import { useState, type FormEvent } from "react"
import { useRouter, redirect } from "next/navigation"

import Image from "next/image"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import {toast} from "sonner";
import { Plus, Trash2, Users } from "lucide-react"

type Variants = {
    label: string
    value: string
}

const vars_: Variants[] = [
    { label: "Variant 1", value: "/1.jpg" },
    { label: "Variant 2", value: "/2.jpg" },
    { label: "Variant 3", value: "/3.jpg" },
]

const DESCRIPTION_MAX_LENGTH = 70

const roles = ["lecturer", "ta"] as const
type Role = typeof roles[number]
const roleLabels: Record<Role, string> = { lecturer: "Lecturer", ta: "TA" }
type Member = { email: string; role: Role }

function RolePicker({ value, onChange, label, disabled }: {
    value: Role; onChange: (role: Role) => void; label: string; disabled?: boolean
}) {
    return (
        <Combobox items={roles} value={value} onValueChange={(role) => role && onChange(role)} itemToStringLabel={(role) => roleLabels[role]} disabled={disabled}>
            <ComboboxInput aria-label={label} readOnly className="w-full sm:w-32" />
            <ComboboxContent>
                <ComboboxList>{(role: Role) => <ComboboxItem key={role} value={role}>{roleLabels[role]}</ComboboxItem>}</ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

export default function CreateCourse() {
    const router = useRouter()

    const [courseName, setCourseName] = useState("")
    const [courseDescription, setCourseDescription] = useState("")
    const [selectedVariant, setSelectedVariant] = useState<Variants | null>(vars_[0])

    const [members, setMembers] = useState<Member[]>([])
    const [memberEmail, setMemberEmail] = useState("")
    const [memberRole, setMemberRole] = useState<Role>("ta")

    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const addMember = (event: FormEvent) => {
        event.preventDefault()
        const normalized = memberEmail.trim().toLowerCase()
        if (!normalized) return
        if (members.some((member) => member.email === normalized)) {
            toast.error("This user is already added")
            return
        }
        setMembers([...members, { email: normalized, role: memberRole }])
        setMemberEmail("")
    }

    const handleCreate = async () => {
        const toastId = toast.loading("Creating course...", {position: "top-right"})
        try {
            setIsOpen(false)

            if (courseName.trim() === "" || courseDescription.trim() === "") {
                toast.error("All form must be filled.", { id: toastId })
                return
            }

            setIsLoading(true)

            const res = await fetch(`/api_course/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_name: courseName,
                    course_description: courseDescription,
                    course_thumbnail: selectedVariant?.value,
                }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                toast.error(typeof errorData.detail === "string" ? errorData.detail : `Failed to create course: ${res.status}`, { id: toastId })
                setIsLoading(false)
                return
            }

            const data = await res.json()

            // Add TA / lecturer members using the edit route (creator stays lecturer)
            if (members.length > 0) {
                const meRes = await fetch("/api_auth/me", { credentials: "include" })
                const me = await meRes.json().catch(() => ({}))
                const myEmail = String(me.email ?? "").toLowerCase()

                const editRes = await fetch("/api_course/edit", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        course_id: data.course_id,
                        course_name: courseName.trim(),
                        course_description: courseDescription.trim(),
                        members: [
                            { email: myEmail, role: "lecturer" },
                            ...members.filter((member) => member.email !== myEmail),
                        ],
                    }),
                })

                if (!editRes.ok) {
                    const errorData = await editRes.json().catch(() => ({}))
                    const detail = typeof errorData.detail === "string" ? errorData.detail : "Failed to add members"
                    toast.error(`Course created, but members were not added: ${detail}`, { id: toastId })
                    setTimeout(() => {
                        router.push(`/courses/${data.course_id}/edit`)
                    }, 1500)
                    return
                }
            }

            toast.success(`Course ${data.course_name} created successfully.`, { id: toastId })
            setTimeout(() => {
                redirect(`/courses/${data.course_id}/dashboard`)
            }, 1200)
        }
        catch (error) {
            toast.error(`Error while creating course: ${error}`, { id: toastId })
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-start h-screen w-max min-w-90 sm:w-100 md:w-150 lg:w-200 xl:w-270 px-1 pt-16 pb-10 overflow-y-auto scrollbar-none">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-1">Create a Course</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Fill in the details below to set up a new course
                </p>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Course Thumbnail</label>
                        {selectedVariant ? (
                            <div className="relative w-full h-60 mb-2 rounded-lg overflow-hidden border">
                                <Image src={selectedVariant.value} alt="Course preview" fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-full h-40 mb-2 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                                No image selected
                            </div>
                        )}
                        <Combobox
                            items={vars_}
                            itemToStringValue={(variant) => variant.label}
                            value={selectedVariant}
                            onValueChange={(variant) => setSelectedVariant(variant)}
                        >
                            <ComboboxInput placeholder="Select a thumbnail" />
                            <ComboboxContent>
                                <ComboboxEmpty>No items found.</ComboboxEmpty>
                                <ComboboxList>
                                    {(variant) => (
                                        <ComboboxItem key={variant.value} value={variant}>
                                            {variant.label}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Course Name</label>
                        <Input
                            placeholder="Your desire course name"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Textarea
                            placeholder="Briefly describe this course..."
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            rows={5}
                            className="h-30"
                        />
                        <p className="text-xs text-muted-foreground text-right mt-1">
                            {courseDescription.length}/{DESCRIPTION_MAX_LENGTH}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="member-email" className="text-sm font-medium mb-1 flex items-center gap-2">
                            <Users className="size-4" />Course members ({members.length + 1})
                        </label>
                        <form onSubmit={addMember} className="flex flex-col gap-2 sm:flex-row">
                            <Input
                                id="member-email"
                                type="email"
                                placeholder="user@ku.th"
                                value={memberEmail}
                                disabled={isLoading}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                className="flex-1"
                            />
                            <RolePicker value={memberRole} onChange={setMemberRole} label="New member role" disabled={isLoading} />
                            <Button type="submit" variant="outline" disabled={isLoading || !memberEmail.trim()}><Plus />Add</Button>
                        </form>
                        <p className="text-xs text-muted-foreground mt-1">
                            You are added as lecturer automatically. Use emails of registered CourseHub users.
                        </p>

                        {members.length > 0 && (
                            <ul className="divide-y rounded-lg border px-3 mt-3">
                                {members.map((member) => (
                                    <li key={member.email} className="flex items-center gap-2 py-2">
                                        <p className="min-w-0 flex-1 break-all text-sm">{member.email}</p>
                                        <RolePicker
                                            value={member.role}
                                            label={`Role for ${member.email}`}
                                            disabled={isLoading}
                                            onChange={(newRole) => setMembers(members.map((item) => item.email === member.email ? { ...item, role: newRole } : item))}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove ${member.email}`}
                                            disabled={isLoading}
                                            onClick={() => setMembers(members.filter((item) => item.email !== member.email))}
                                        >
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="flex flex-row justify-end gap-2 mt-6">
                    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                        <AlertDialogTrigger render={<Button disabled={isLoading} className="px-5" />}>
                            Create Course
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Submit this course?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will create a new course with the form details.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCreate}>Create</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    )
}