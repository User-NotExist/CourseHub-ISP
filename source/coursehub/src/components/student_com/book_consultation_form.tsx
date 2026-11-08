"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

export type BookingInput = {
    first_name: string
    last_name: string
    email: string
    description: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function BookConsultationForm({
    slotLabel,
    onCancel,
    onConfirm,
}: {
    slotLabel: string // e.g. "09/11/2026, 10:00 - 11:00"
    onCancel: () => void
    onConfirm: (input: BookingInput) => Promise<void> // throws an Error with the message to show
}) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [description, setDescription] = useState("")
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    // validate first, then ask the student to confirm (a booking cannot be cancelled)
    const handle_submit = (event: FormEvent) => {
        event.preventDefault()
        if (!firstName.trim() || !lastName.trim()) return setFormError("First name and last name are required")
        if (!emailPattern.test(email.trim())) return setFormError("Invalid email")

        setFormError(null)
        setIsConfirmOpen(true)
    }

    const handle_confirm = async () => {
        setIsSubmitting(true)
        try {
            await onConfirm({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                description: description.trim(),
            })
        } catch (error) {
            setIsConfirmOpen(false)
            setFormError(error instanceof Error ? error.message : "Failed to book consultation")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
            <form
                onSubmit={handle_submit}
                noValidate
                onClick={(event) => event.stopPropagation()}
                className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-white p-6"
            >
                <h2 className="text-2xl font-bold">Book Consultation ({slotLabel})</h2>

                <div className="flex flex-col gap-3 rounded-2xl border border-gray-300 p-5">
                    <label className="flex max-w-md flex-col gap-1">
                        First Name
                        <Input value={firstName} disabled={isSubmitting} onChange={(e) => setFirstName(e.target.value)} className="bg-[#f8f8f8]" />
                    </label>
                    <label className="flex max-w-md flex-col gap-1">
                        Last Name
                        <Input value={lastName} disabled={isSubmitting} onChange={(e) => setLastName(e.target.value)} className="bg-[#f8f8f8]" />
                    </label>
                    <label className="flex max-w-md flex-col gap-1">
                        Contact
                        <Input
                            type="email"
                            value={email}
                            disabled={isSubmitting}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@ku.th"
                            className="bg-[#f8f8f8]"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        What do you want to consult about? (optional)
                        <Textarea
                            rows={3}
                            value={description}
                            disabled={isSubmitting}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-[#f8f8f8]"
                        />
                    </label>

                    {formError && <p role="alert" className="text-sm font-bold text-red-600">{formError}</p>}

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="gap-2 bg-[#054a46] text-white hover:bg-[#054a46]/90">
                            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                            Confirm
                        </Button>
                    </div>
                </div>
            </form>

            <AlertDialog
                open={isConfirmOpen}
                onOpenChange={(open) => {
                    if (!open && !isSubmitting) setIsConfirmOpen(false)
                }}
            >
                <AlertDialogContent onClick={(event) => event.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Book this consultation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {slotLabel}. Are you sure? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSubmitting}
                            className="bg-[#054a46] text-white hover:bg-[#054a46]/90"
                            onClick={(event) => {
                                event.preventDefault()
                                void handle_confirm()
                            }}
                        >
                            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                            {isSubmitting ? "Booking..." : "Book"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}