"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import ConsultCalendar, { toDateKey, type Availability } from "@/components/student_com/consult_calendar"
import BookConsultationForm, { type BookingInput } from "@/components/student_com/book_consultation_form"

type Consultation = {
    consultant_email: string
    start_time: string // 
    end_time: string
}

const mock_consultants = [
    "chargerplug@ku.ac.th",
    "bananaman@ku.ac.th",
    "craigtucker@ku.ac.th",
    "lecturer@ku.ac.th",
]

const today = new Date()
const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
const mockKey = (offset: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

const mock_availability: Record<string, Availability> = {
    [mockKey(1)]: "available",
    [mockKey(2)]: "uncertain",
    [mockKey(3)]: "unavailable",
}

const mock_consultations: Record<string, Consultation[]> = {
    [mockKey(0)]: [
        { consultant_email: "chargerplug@ku.ac.th", start_time: "08:00", end_time: "10:00" },
        { consultant_email: "bananaman@ku.ac.th", start_time: "11:00", end_time: "13:00" },
        { consultant_email: "craigtucker@ku.ac.th", start_time: "19:00", end_time: "19:30" },
    ],
}

const monthFull = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

function ordinal(day: number) {
    if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`
    return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`
}

export default function StudentAppointment() {
    const { id: courseId } = useParams<{ id: string }>()

    const [courseName, setCourseName] = useState<string | null>(null)
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selected, setSelected] = useState(todayKey)
    const [consultations, setConsultations] = useState(mock_consultations)
    const [isFormOpen, setIsFormOpen] = useState(false)

    useEffect(() => {
        fetch(`/api_course/read_name?course_id=${encodeURIComponent(courseId)}`)
            .then((res) => {
                if (!res.ok) throw new Error("Course not found")
                return res.json()
            })
            .then((data) => setCourseName(data.course_name))
            .catch(() => setCourseName("Course not found"))
    }, [courseId])

    const [selYear, selMonth, selDay] = selected.split("-").map(Number)
    const heading = `${ordinal(selDay)} ${monthFull[selMonth - 1]} ${selYear}`
    const dateLabel = `${String(selDay).padStart(2, "0")}/${String(selMonth).padStart(2, "0")}/${selYear}`
    const onThisDate = consultations[selected] ?? []

    const validate_booking = (input: BookingInput) => {
        if (selected < todayKey) return "Cannot book a date that has already passed"
        if (mock_availability[selected] === "unavailable") return "This date is not available for consultation"
        const overlaps = onThisDate.some(
            (c) =>
                c.consultant_email === input.consultant_email &&
                input.start_time < c.end_time &&
                input.end_time > c.start_time,
        )
        if (overlaps) return "This time overlaps with an existing consultation for this TA / lecturer"
        return null
    }

    const handle_confirm = (input: BookingInput) => {
        setConsultations((prev) => ({
            ...prev,
            [selected]: [
                ...(prev[selected] ?? []),
                { consultant_email: input.consultant_email, start_time: input.start_time, end_time: input.end_time },
            ],
        }))
        setIsFormOpen(false)
        toast.success("Consultation booked.", { position: "top-right" })
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <div className="flex flex-col gap-4 bg-[#054a46] p-6 md:flex-row">
                <div className="flex items-center rounded-2xl bg-[#006c67] px-6 py-3 text-2xl font-bold text-white">
                    Book Consultation
                </div>
                <div className="flex flex-1 items-center rounded-2xl bg-[#6b9491] px-6 py-3 text-xl font-bold text-white">
                    {courseName ?? "Loading..."}
                </div>
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-[1fr_2fr] md:p-10">
                <div className="flex flex-col gap-3">
                    <h2 className="text-2xl font-bold">Choose consultation Date</h2>
                    <ConsultCalendar
                        year={viewYear}
                        month={viewMonth}
                        selected={selected}
                        availability={mock_availability}
                        onMonthChange={(y, m) => {
                            setViewYear(y)
                            setViewMonth(m)
                        }}
                        onSelect={setSelected}
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <h2 className="text-2xl font-bold">{heading}</h2>
                    <div className="flex flex-col gap-4 rounded-2xl border border-gray-300 p-5">
                        <div>
                            <Button
                                onClick={() => setIsFormOpen(true)}
                                className="gap-2 bg-[#054a46] text-white hover:bg-[#054a46]/90"
                            >
                                <Plus className="size-4" />
                                Book Consultation
                            </Button>
                        </div>

                        <h3 className="text-xl font-bold">Consultations on this date</h3>
                        <div className="grid grid-cols-[1fr_auto] px-5 text-gray-500">
                            <span>TA / Lecturer</span>
                            <span>Time</span>
                        </div>
                        <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-gray-300 bg-[#f8f8f8] p-3">
                            {onThisDate.length === 0 ? (
                                <p className="py-6 text-center text-sm text-gray-500">No consultations on this date.</p>
                            ) : (
                                onThisDate.map((c, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_auto] gap-4 border-b border-gray-300 px-2 py-2">
                                        <span className="truncate">{c.consultant_email}</span>
                                        <span>{c.start_time} - {c.end_time}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isFormOpen && (
                <BookConsultationForm
                    dateLabel={dateLabel}
                    consultants={mock_consultants}
                    validate={validate_booking}
                    onCancel={() => setIsFormOpen(false)}
                    onConfirm={handle_confirm}
                />
            )}
        </div>
    )
}