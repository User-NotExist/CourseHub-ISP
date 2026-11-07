"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import ConsultCalendar, { toDateKey, type Availability } from "@/components/student_com/consult_calendar"
import BookConsultationForm, { type BookingInput } from "@/components/student_com/book_consultation_form"

// One open time slot created by a lecturer/TA (backend: features/appointments/student.py)
type Slot = {
    available_id: number // (sic) the backend spells it this way
    appointment_head: { lecturer?: string[]; ta?: string[] } | null
    available_date: string // "YYYY-MM-DD"
    start_time: string // "HH:MM:SS"
    end_time: string
    notes: string | null
    max_bookings: number
    booked: number
    is_full: boolean
}

const today = new Date()
const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

const monthFull = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

function ordinal(day: number) {
    if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`
    return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`
}

function toDisplayDate(dateKey: string) {
    const [y, m, d] = dateKey.split("-")
    return `${d}/${m}/${y}`
}

const shortTime = (time: string) => time.slice(0, 5) // "10:00:00" -> "10:00"

async function fetchSlots(courseId: string): Promise<Slot[]> {
    const res = await fetch(`/api_appointment/student_read?course_id=${encodeURIComponent(courseId)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load appointments")
    return data
}

function hostsOf(slot: Slot) {
    return [...(slot.appointment_head?.lecturer ?? []), ...(slot.appointment_head?.ta ?? [])]
}

export default function StudentAppointment() {
    const { id: courseId } = useParams<{ id: string }>()
    const router = useRouter()

    const [courseName, setCourseName] = useState<string | null>(null)
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selected, setSelected] = useState(todayKey)
    const [slots, setSlots] = useState<Slot[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [bookingSlot, setBookingSlot] = useState<Slot | null>(null)

    useEffect(() => {
        fetch(`/api_course/read_name?course_id=${encodeURIComponent(courseId)}`)
            .then((res) => {
                if (!res.ok) throw new Error("Course not found")
                return res.json()
            })
            .then((data) => setCourseName(data.course_name))
            .catch(() => setCourseName("Course not found"))
    }, [courseId])

    // First load: if today has no slots, jump to the first date that has one
    useEffect(() => {
        fetchSlots(courseId)
            .then((loaded) => {
                setSlots(loaded)
                if (loaded.length === 0 || loaded.some((s) => s.available_date === todayKey)) return
                const first = loaded[0].available_date
                const [y, m] = first.split("-").map(Number)
                setSelected(first)
                setViewYear(y)
                setViewMonth(m - 1)
            })
            .catch((error) => setLoadError(error instanceof Error ? error.message : "Failed to load appointments"))
            .finally(() => setIsLoading(false))
    }, [courseId])

    const reloadSlots = async () => {
        try {
            setSlots(await fetchSlots(courseId))
        } catch {
            // keep the current list if the refresh fails
        }
    }

    const slotsByDate: Record<string, Slot[]> = {}
    for (const slot of slots) {
        ;(slotsByDate[slot.available_date] ??= []).push(slot)
    }

    // green = at least one slot still open, red = every slot on that date is full
    const availability: Record<string, Availability> = {}
    for (const [date, daySlots] of Object.entries(slotsByDate)) {
        availability[date] = daySlots.some((s) => !s.is_full) ? "available" : "unavailable"
    }

    const [selYear, selMonth, selDay] = selected.split("-").map(Number)
    const heading = `${ordinal(selDay)} ${monthFull[selMonth - 1]} ${selYear}`
    const onThisDate = slotsByDate[selected] ?? []

    const handle_book = async (input: BookingInput) => {
        if (!bookingSlot) return
        const res = await fetch("/api_appointment/student_book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                course_id: courseId,
                available_id: bookingSlot.available_id,
                student_first_name: input.first_name,
                student_last_name: input.last_name,
                student_email: input.email,
                appointments_description: input.description || null,
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const detail = typeof data.detail === "string" ? data.detail : "Failed to book consultation"
            await reloadSlots() // the slot may have just become full
            throw new Error(detail)
        }

        setBookingSlot(null)
        toast.success("Consultation booked.", { position: "top-right" })
        await reloadSlots()
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <div className="flex flex-col gap-4 bg-[#054a46] p-6 md:flex-row">
                <div className="flex items-center rounded-2xl bg-[#006c67] px-6 py-3 text-2xl font-bold text-white">
                    Book Consultation
                </div>
                <div className="flex flex-1 items-center rounded-2xl bg-panel px-6 py-3 text-xl font-bold text-panel-foreground">
                    {courseName ?? "Loading..."}
                </div>
            </div>

            <div className="px-6 pt-6 md:px-10">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/students/${courseId}`)}
                    className="h-auto gap-2 rounded-xl border-brand/30 bg-white px-5 py-3 text-base font-semibold text-brand-ink shadow-sm transition hover:bg-brand hover:text-brand-foreground"
                >
                    <ArrowLeft />
                    Back to FAQ
                </Button>
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-[1fr_2fr] md:px-10 md:pt-6 md:pb-10">
                <div className="flex flex-col gap-3">
                    <h2 className="text-2xl font-bold">Choose consultation Date</h2>
                    <ConsultCalendar
                        year={viewYear}
                        month={viewMonth}
                        selected={selected}
                        availability={availability}
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
                        <h3 className="text-xl font-bold">Available times on this date</h3>
                        <div className="grid grid-cols-[1fr_8rem_5rem_6rem] gap-4 px-5 text-gray-500">
                            <span>TA / Lecturer</span>
                            <span>Time</span>
                            <span>Booked</span>
                            <span />
                        </div>
                        <div className="flex max-h-80 flex-col overflow-y-auto rounded-lg border border-gray-300 bg-[#f8f8f8] p-3">
                            {isLoading ? (
                                <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
                            ) : loadError ? (
                                <p role="alert" className="py-6 text-center text-sm text-red-600">{loadError}</p>
                            ) : onThisDate.length === 0 ? (
                                <p className="py-6 text-center text-sm text-gray-500">No available times on this date.</p>
                            ) : (
                                onThisDate.map((slot) => (
                                    <div
                                        key={slot.available_id}
                                        className="grid grid-cols-[1fr_8rem_5rem_6rem] items-center gap-4 border-b border-gray-300 px-2 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate">{hostsOf(slot).join(", ") || "-"}</p>
                                            {slot.notes && <p className="truncate text-sm text-gray-500">{slot.notes}</p>}
                                        </div>
                                        <span>{shortTime(slot.start_time)} - {shortTime(slot.end_time)}</span>
                                        <span>{slot.booked}/{slot.max_bookings}</span>
                                        <Button
                                            size="sm"
                                            disabled={slot.is_full}
                                            onClick={() => setBookingSlot(slot)}
                                            className="bg-[#054a46] text-white hover:bg-[#054a46]/90"
                                        >
                                            {slot.is_full ? "Full" : "Book"}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {bookingSlot && (
                <BookConsultationForm
                    slotLabel={`${toDisplayDate(bookingSlot.available_date)}, ${shortTime(bookingSlot.start_time)} - ${shortTime(bookingSlot.end_time)}`}
                    onCancel={() => setBookingSlot(null)}
                    onConfirm={handle_book}
                />
            )}
        </div>
    )
}