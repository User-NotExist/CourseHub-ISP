"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type BookingInput = {
    first_name: string
    last_name: string
    contact: string
    consultant_email: string
    start_time: string 
    end_time: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function BookConsultationForm({
    dateLabel,
    consultants,
    validate,
    onCancel,
    onConfirm,
}: {
    dateLabel: string // 
    consultants: string[] // 
    validate: (input: BookingInput) => string | null 
    onCancel: () => void
    onConfirm: (input: BookingInput) => void
}) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [contact, setContact] = useState("")
    const [consultant, setConsultant] = useState(consultants[0] ?? "")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [formError, setFormError] = useState<string | null>(null)

    const handle_submit = (event: FormEvent) => {
        event.preventDefault()
        if (!firstName.trim() || !lastName.trim()) return setFormError("First name and last name are required")
        if (!emailPattern.test(contact.trim())) return setFormError("Invalid email")
        if (!consultant) return setFormError("Please choose a TA or lecturer")
        if (!startTime || !endTime) return setFormError("Start time and end time are required")
        if (endTime <= startTime) return setFormError("End time must be after start time")

        const input: BookingInput = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            contact: contact.trim(),
            consultant_email: consultant,
            start_time: startTime,
            end_time: endTime,
        }
        const pageError = validate(input)
        if (pageError) return setFormError(pageError)

        setFormError(null)
        onConfirm(input)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
            <form
                onSubmit={handle_submit}
                noValidate
                onClick={(event) => event.stopPropagation()}
                className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-white p-6"
            >
                <h2 className="text-2xl font-bold">Book Consultation ({dateLabel})</h2>

                <div className="flex flex-col gap-3 rounded-2xl border border-gray-300 p-5">
                    <label className="flex max-w-md flex-col gap-1">
                        First Name
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-[#f8f8f8]" />
                    </label>
                    <label className="flex max-w-md flex-col gap-1">
                        Last Name
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-[#f8f8f8]" />
                    </label>
                    <label className="flex max-w-md flex-col gap-1">
                        Contact
                        <Input
                            type="email"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="example@ku.th"
                            className="bg-[#f8f8f8]"
                        />
                    </label>
                    <label className="flex max-w-xs flex-col gap-1">
                        Choose TA / Lecturer
                        <select
                            value={consultant}
                            onChange={(e) => setConsultant(e.target.value)}
                            className="h-8 rounded-lg border border-input bg-[#f8f8f8] px-2 text-sm"
                        >
                            {consultants.map((email) => (
                                <option key={email} value={email}>{email}</option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-end gap-4">
                        <label className="flex flex-col gap-1">
                            Start Time
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-[#f8f8f8]" />
                        </label>
                        <span className="pb-1">-</span>
                        <label className="flex flex-col gap-1">
                            End Time
                            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-[#f8f8f8]" />
                        </label>
                    </div>

                    {formError && <p role="alert" className="text-sm font-bold text-red-600">{formError}</p>}

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-[#054a46] text-white hover:bg-[#054a46]/90">
                            Confirm
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}