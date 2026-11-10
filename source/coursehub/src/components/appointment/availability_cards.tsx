"use client"

import { useEffect, useMemo, useState } from "react"

import DateAvailabilityCard from "@/components/appointment/date_availability_card"
import QuickSelectCard from "@/components/appointment/quick_select_card"
import type { AppointmentSlot } from "@/lib/appointments"
import { fetchStaffContext, type StaffContext } from "@/lib/availability"

// Row of two cards (about 25 : 75): the selected date's availability, and Quick select for date ranges.
export default function AvailabilityCards({
    courseId,
    selectedDate,
    slots,
    loading,
    onChanged,
}: {
    courseId: string
    selectedDate: string
    slots: AppointmentSlot[]
    loading: boolean
    onChanged: () => void
}) {
    // `staff.courseId` records which course the answer belongs to; anything else means "still checking".
    const [staff, setStaff] = useState<(StaffContext & { courseId: string }) | null>(null)

    useEffect(() => {
        let cancelled = false
        fetchStaffContext(courseId).then((ctx) => !cancelled && setStaff({ courseId, ...ctx }))
        return () => {
            cancelled = true
        }
    }, [courseId])

    const checking = staff?.courseId !== courseId
    const canEdit = !checking && staff.role !== null && staff.email !== ""
    const hostEmail = checking ? "" : staff.email
    // Slots only have lecturer / TA hosts, so an admin is listed as a lecturer host.
    const hostRole = checking || staff.role === null || staff.role === "admin" ? "lecturer" : staff.role
    // only shown when the controls are locked because of permissions
    const permissionNote = checking
        ? null
        : staff.problem ?? (staff.role === null ? "You aren't a lecturer or TA of this course, or an admin." : null)

    const daySlots = useMemo(() => slots.filter((s) => s.date === selectedDate), [slots, selectedDate])

    return (
        <div className="grid w-full shrink-0 gap-8 md:grid-cols-[minmax(16rem,1fr)_3fr]">
            <DateAvailabilityCard
                key={selectedDate}
                courseId={courseId}
                date={selectedDate}
                daySlots={daySlots}
                canEdit={canEdit}
                checking={checking}
                loading={loading}
                hostEmail={hostEmail}
                hostRole={hostRole}
                permissionNote={permissionNote}
                onChanged={onChanged}
            />
            <QuickSelectCard
                courseId={courseId}
                slots={slots}
                canEdit={canEdit}
                checking={checking}
                loading={loading}
                hostEmail={hostEmail}
                hostRole={hostRole}
                permissionNote={permissionNote}
                onChanged={onChanged}
            />
        </div>
    )
}
