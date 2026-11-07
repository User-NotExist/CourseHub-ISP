import os
import html

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Course, Appointments, AppointmentsAvailable

import resend

router = APIRouter(prefix="/students/{course_id}/appointments", tags=["student_appointments"])

resend.api_key = os.environ["RESEND_API_KEY"]


class AppointmentBook(BaseModel):
    student_first_name: str = Field(min_length=1)
    student_last_name: str = Field(min_length=1)
    student_email: str = Field(min_length=1)
    appointments_description: Optional[str] = None


def slot_data(s: AppointmentsAvailable):
    booked = len(s.appointments)
    return {
        "available_id": s.available_id,
        "appointment_head": s.appointment_head,
        "available_date": str(s.available_date),
        "start_time": str(s.start_time),
        "end_time": str(s.end_time),
        "notes": s.notes,
        "max_bookings": s.max_bookings,
        "booked": booked,
        "is_full": booked >= s.max_bookings,
    }


# Display upcoming available dates (no booker info)
@router.get("/available/read")
async def student_display_appointments_available(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    all_slots = (
        db.query(AppointmentsAvailable)
        .filter(
            AppointmentsAvailable.course_id == course_id,
            AppointmentsAvailable.available_date >= date.today(),
        )
        .order_by(AppointmentsAvailable.available_date, AppointmentsAvailable.start_time)
        .all()
    )

    return [slot_data(s) for s in all_slots]


@router.post("/book/{available_id}")
async def student_book_appointment(
    course_id: str,
    available_id: int,
    payload: AppointmentBook,
    db: Session = Depends(get_db),
):
    # lock the slot row so two students can't take the last seat at the same time
    slot = (
        db.query(AppointmentsAvailable)
        .filter(
            AppointmentsAvailable.available_id == available_id,
            AppointmentsAvailable.course_id == course_id,
        )
        .with_for_update()
        .first()
    )
    if not slot:
        raise HTTPException(status_code=404, detail="Available date not found !")

    if slot.available_date < date.today():
        raise HTTPException(status_code=400, detail="This date has already passed !")

    if len(slot.appointments) >= slot.max_bookings:
        raise HTTPException(status_code=400, detail="This slot is full !")

    email = payload.student_email.strip().lower()
    already_booked = db.query(Appointments).filter(
        Appointments.available_id == available_id,
        Appointments.student_email == email,
    ).first()
    if already_booked:
        raise HTTPException(status_code=400, detail="You already booked this slot !")

    new_appointment = Appointments(
        course_id=course_id,
        available_id=available_id,
        student_first_name=payload.student_first_name,
        student_last_name=payload.student_last_name,
        student_email=email,
        appointments_description=payload.appointments_description,
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    esc = lambda v: html.escape(str(v or ""))
    heads = slot.appointment_head or {}
    consultants = ", ".join((heads.get("lecturer") or []) + (heads.get("ta") or [])) or "-"
    course_name = slot.course.course_name if slot.course else ""
    booked = len(slot.appointments)
    poster = slot.user  # lecturer / TA who posted the available date

    params: resend.Emails.SendParams = {
        "from": "CourseHub <onboarding@resend.dev>",
        "to": [poster.user_email],
        "subject": f"New appointment booked - {course_name}",
        "html": f"""
            <p>Hi {esc(poster.name)},</p>
            <p>A student booked your available date in <strong>{esc(course_name)}</strong>.</p>
            <ul>
                <li><strong>Student:</strong> {esc(new_appointment.student_first_name)} {esc(new_appointment.student_last_name)}</li>
                <li><strong>Email:</strong> {esc(new_appointment.student_email)}</li>
                <li><strong>Message:</strong> {esc(new_appointment.appointments_description) or "-"}</li>
                <li><strong>Date:</strong> {esc(slot.available_date)}</li>
                <li><strong>Time:</strong> {slot.start_time.strftime("%H:%M")} - {slot.end_time.strftime("%H:%M")}</li>
                <li><strong>With:</strong> {esc(consultants)}</li>
                <li><strong>Booked:</strong> {booked}/{slot.max_bookings}</li>
            </ul>
            <p>CourseHub</p>
        """,
    }

    student_params: resend.Emails.SendParams = {
        "from": "CourseHub <onboarding@resend.dev>",
        "to": [new_appointment.student_email],
        "subject": f"Appointment confirmed - {course_name}",
        "html": f"""
            <p>Hi {esc(new_appointment.student_first_name)} {esc(new_appointment.student_last_name)},</p>
            <p>Your consultation for <strong>{esc(course_name)}</strong> is booked.</p>
            <ul>
                <li><strong>Date:</strong> {esc(slot.available_date)}</li>
                <li><strong>Time:</strong> {slot.start_time.strftime("%H:%M")} - {slot.end_time.strftime("%H:%M")}</li>
                <li><strong>With:</strong> {esc(consultants)}</li>
                <li><strong>Notes:</strong> {esc(slot.notes) or "-"}</li>
                <li><strong>Your message:</strong> {esc(new_appointment.appointments_description) or "-"}</li>
            </ul>
            <p>CourseHub</p>
        """,
    }

    # booking is already saved, this one just send the eamil notification to the lecturer / TA who posted the available date
    try:
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send booking email: {e}")

    # confirmation email back to the student
    try:
        resend.Emails.send(student_params)
    except Exception as e:
        print(f"Failed to send student confirmation email: {e}")

    return {
        "appointment_id": new_appointment.appointment_id,
        "available_id": new_appointment.available_id,
        "student_first_name": new_appointment.student_first_name,
        "student_last_name": new_appointment.student_last_name,
        "student_email": new_appointment.student_email,
        "appointments_description": new_appointment.appointments_description,
        "available_date": str(slot.available_date),
        "start_time": str(slot.start_time),
        "end_time": str(slot.end_time),
    }
