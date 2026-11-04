"use client"

import { slotColor } from "@/components/calendar/appointment_calendar"
import { useTodayKey } from "@/components/calendar/course_calendar"
import { daysFromToday, formatDate, type AppointmentSlot } from "@/lib/appointments"

function Row({
    slot, note, noteClass, onHover, onSelect,
}: {
    slot: AppointmentSlot
    note: string
    noteClass: string
    onHover?: (date: string | null) => void
    onSelect?: (date: string) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect?.(slot.date)}
            onMouseEnter={() => onHover?.(slot.date)}
            onMouseLeave={() => onHover?.(null)}
            className="flex w-full items-center gap-3 rounded-lg bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
        >
            <span className={`h-1.5 w-5 shrink-0 rounded-full ${slotColor(slot)}`} />
            <span className="flex-1 truncate font-medium">
                {slot.startTime} - {slot.endTime}
                <span className="ml-3 text-sm font-normal text-gray-500">{slot.booked}/{slot.maxBookings} booked</span>
            </span>
            <span className="text-sm text-gray-500">{formatDate(slot.date)}</span>
            <span className={`w-24 text-right text-sm font-semibold ${noteClass}`}>{note}</span>
        </button>
    )
}

const byDateThenTime = (a: AppointmentSlot, b: AppointmentSlot) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)

// Same two-column card as the Main page's Upcoming / Late Tasks, for appointment slots.
export default function UpcomingAppointments({
    slots, onHoverDate, onSelectDate,
}: {
    slots: AppointmentSlot[]
    onHoverDate?: (date: string | null) => void // tells the calendar which date to highlight
    onSelectDate?: (date: string) => void
}) {
    const todayKey = useTodayKey()

    // on the server todayKey is "", so show nothing until the browser knows today
    const dated = todayKey ? slots.map((s) => ({ s, d: daysFromToday(s.date, todayKey) })) : []

    const upcoming = dated.filter((x) => x.d >= 0 && x.d <= 7).map((x) => x.s).sort(byDateThenTime)
    const recent = dated.filter((x) => x.d < 0 && x.d >= -7).map((x) => x.s).sort((a, b) => byDateThenTime(b, a))

    const upcomingNote = (date: string) => {
        const d = daysFromToday(date, todayKey)
        return d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`
    }
    const recentNote = (date: string) => {
        const d = -daysFromToday(date, todayKey)
        return d === 1 ? "Yesterday" : `${d} days ago`
    }

    return (
        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-2">
            <div className="flex min-h-0 flex-col gap-3">
                <h3 className="text-lg font-bold">Upcoming</h3>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none">
                    {upcoming.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">None...</p>
                    ) : (
                        upcoming.map((s) => (
                            <Row key={s.id} slot={s} note={upcomingNote(s.date)} noteClass="text-brand" onHover={onHoverDate} onSelect={onSelectDate} />
                        ))
                    )}
                </div>
            </div>

            <div className="flex min-h-0 flex-col gap-3">
                <h3 className="text-lg font-bold text-gray-600">Recent</h3>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none">
                    {recent.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">No appointments in the last 7 days.</p>
                    ) : (
                        recent.map((s) => (
                            <Row key={s.id} slot={s} note={recentNote(s.date)} noteClass="text-gray-500" onHover={onHoverDate} onSelect={onSelectDate} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
