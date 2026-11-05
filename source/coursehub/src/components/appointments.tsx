"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Card } from "@/components/ui/card"
import AppointmentCalendar from "@/components/calendar/appointment_calendar"
import UpcomingAppointments from "@/components/calendar/upcoming_appointments"
import AvailabilityCards from "@/components/availability_cards"
import { useTodayKey } from "@/components/calendar/course_calendar"
import { useCourseName } from "@/lib/use_course_name"
import {
    fetchAppointmentSlots,
    fetchSlotBookings,
    formatLongDate,
    isFull,
    type AppointmentSlot,
    type Booking,
} from "@/lib/appointments"

type BookingState =
    | { status: "ok"; bookings: Booking[] }
    | { status: "error"; message: string }

// Staff view (Consultation > Appointments): the Main page calendar, but for the
// appointment slots students booked with the lecturers / TAs of this course.
export default function AppointmentsPage() {
    const { id: courseId } = useParams<{ id: string }>()
    const courseName = useCourseName(courseId)
    const todayKey = useTodayKey()

    // `state.courseId` records which course the current slots/error belong to; anything else means "loading".
    const [state, setState] = useState<{
        courseId: string
        slots: AppointmentSlot[]
        error: string
    } | null>(null)

    const [picked, setPicked] = useState<string | null>(null)
    const [hoveredDate, setHoveredDate] = useState<string | null>(null)
    const [bookingsBySlot, setBookingsBySlot] = useState<Record<number, BookingState>>({})
    const requested = useRef(new Set<number>())
    const [reloadKey, setReloadKey] = useState(0) // bump to reload the slots after a change

    useEffect(() => {
        let cancelled = false
        fetchAppointmentSlots(courseId)
            .then((slots) => !cancelled && setState({ courseId, slots, error: "" }))
            .catch((err: Error) => !cancelled && setState({ courseId, slots: [], error: err.message }))
        return () => {
            cancelled = true
        }
    }, [courseId, reloadKey])

    const loading = state?.courseId !== courseId
    const slots = useMemo(() => (loading ? [] : state.slots), [loading, state])
    const error = loading ? "" : state.error

    // show today until a date is picked
    const selected = picked ?? todayKey
    const daySlots = useMemo(() => slots.filter((s) => s.date === selected), [slots, selected])

    // the slot list only has counts, so fetch the students of the shown date's slots (once each)
    useEffect(() => {
        for (const slot of daySlots) {
            if (slot.booked === 0 || requested.current.has(slot.id)) continue
            requested.current.add(slot.id)
            fetchSlotBookings(courseId, slot.id)
                .then((bookings) =>
                    setBookingsBySlot((prev) => ({ ...prev, [slot.id]: { status: "ok", bookings } })),
                )
                .catch((err: Error) => {
                    requested.current.delete(slot.id) // allow a retry when the date is picked again
                    setBookingsBySlot((prev) => ({ ...prev, [slot.id]: { status: "error", message: err.message } }))
                })
        }
    }, [courseId, daySlots])

    const totalStudents = daySlots.reduce((sum, s) => sum + s.booked, 0)

    return (
        <div className="flex w-full min-w-0 flex-col p-6 md:p-10 overflow-y-auto gap-8 scrollbar-none">
            <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Appointments</h1>
                <p className="mt-2 truncate text-lg font-semibold text-neutral-900">{courseName ?? "\u00a0"}</p>
            </div>

            {error && (
                <div role="alert" className="rounded-lg bg-danger-soft px-5 py-4 text-danger-soft-foreground">
                    Couldn&apos;t load appointments: {error}
                </div>
            )}

            <AppointmentCalendar
                slots={slots}
                selectedDate={selected}
                highlightDate={hoveredDate}
                onSelect={setPicked}
            />

            <AvailabilityCards
                courseId={courseId}
                selectedDate={selected}
                slots={slots}
                loading={loading}
                onChanged={() => setReloadKey((k) => k + 1)}
            />

            <Card className="flex flex-col w-full bg-gray-100 shadow-lg p-7 gap-5">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold">{selected ? formatLongDate(selected) : "\u00a0"}</h2>
                    <p className="text-sm text-gray-500">
                        {loading
                            ? "Loading..."
                            : `${daySlots.length} ${daySlots.length === 1 ? "slot" : "slots"} - ${totalStudents} ${totalStudents === 1 ? "student" : "students"} booked`}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-10 text-gray-500" role="status">
                        <Loader2 className="size-5 animate-spin" aria-hidden />
                        <span>Loading appointments...</span>
                    </div>
                ) : daySlots.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">No appointments on this date.</p>
                ) : (
                    daySlots.map((slot) => {
                        const booking = bookingsBySlot[slot.id]
                        return (
                            <div key={slot.id} className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-lg font-semibold">{slot.startTime} - {slot.endTime}</span>
                                    <span
                                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                            isFull(slot) ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {slot.booked}/{slot.maxBookings} booked{isFull(slot) ? " - full" : ""}
                                    </span>
                                </div>

                                {slot.hosts.length > 0 && (
                                    <p className="text-sm text-gray-500">
                                        {slot.hosts.map((h) => `${h.role}: ${h.email}`).join(" · ")}
                                    </p>
                                )}
                                {slot.notes && <p className="whitespace-pre-line text-sm">{slot.notes}</p>}

                                {slot.booked === 0 ? (
                                    <p className="text-sm text-gray-500">No students have booked this slot yet.</p>
                                ) : !booking ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500" role="status">
                                        <Loader2 className="size-4 animate-spin" aria-hidden />
                                        Loading students...
                                    </div>
                                ) : booking.status === "error" ? (
                                    <p role="alert" className="text-sm text-red-600">
                                        Couldn&apos;t load students: {booking.message}
                                    </p>
                                ) : (
                                    <ul className="flex flex-col gap-2">
                                        {booking.bookings.map((b) => (
                                            <li key={b.id} className="flex items-start gap-4 rounded-lg bg-gray-100 px-4 py-3">
                                                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                                                    {b.initials}
                                                </span>
                                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                    <div className="flex flex-wrap items-baseline gap-x-3">
                                                        <span className="font-medium">{b.name}</span>
                                                        <span className="truncate text-sm text-gray-500">{b.email}</span>
                                                    </div>
                                                    {b.description && (
                                                        <p className="whitespace-pre-line text-sm">{b.description}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })
                )}
            </Card>

            <UpcomingAppointments slots={slots} onHoverDate={setHoveredDate} onSelectDate={setPicked} />
        </div>
    )
}
