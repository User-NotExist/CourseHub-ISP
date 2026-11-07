from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Course, Appointments, AppointmentsAvailable

router = APIRouter(prefix="/students/{course_id}/appointments", tags=["student_appointments"])


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
