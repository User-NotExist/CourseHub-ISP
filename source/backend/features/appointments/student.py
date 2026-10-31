from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Course, Appointments, AppointmentsAvaliable

router = APIRouter(prefix="/students/{course_id}/appointments", tags=["student_appointments"])


class AppointmentBook(BaseModel):
    student_first_name: str = Field(min_length=1)
    student_last_name: str = Field(min_length=1)
    student_email: str = Field(min_length=1)
    appointments_description: Optional[str] = None


def slot_data(s: AppointmentsAvaliable):
    booked = len(s.appointments)
    return {
        "avaliable_id": s.avaliable_id,
        "appointment_head": s.appointment_head,
        "avaliable_date": str(s.avaliable_date),
        "start_time": str(s.start_time),
        "end_time": str(s.end_time),
        "notes": s.notes,
        "max_bookings": s.max_bookings,
        "booked": booked,
        "is_full": booked >= s.max_bookings,
    }


# Display upcoming avaliable dates (no booker info)
@router.get("/avaliable/read")
async def student_display_appointments_avaliable(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    all_slots = (
        db.query(AppointmentsAvaliable)
        .filter(
            AppointmentsAvaliable.course_id == course_id,
            AppointmentsAvaliable.avaliable_date >= date.today(),
        )
        .order_by(AppointmentsAvaliable.avaliable_date, AppointmentsAvaliable.start_time)
        .all()
    )

    return [slot_data(s) for s in all_slots]


@router.post("/book/{avaliable_id}")
async def student_book_appointment(
    course_id: str,
    avaliable_id: int,
    payload: AppointmentBook,
    db: Session = Depends(get_db),
):
    # lock the slot row so two students can't take the last seat at the same time
    slot = (
        db.query(AppointmentsAvaliable)
        .filter(
            AppointmentsAvaliable.avaliable_id == avaliable_id,
            AppointmentsAvaliable.course_id == course_id,
        )
        .with_for_update()
        .first()
    )
    if not slot:
        raise HTTPException(status_code=404, detail="Avaliable date not found !")

    if slot.avaliable_date < date.today():
        raise HTTPException(status_code=400, detail="This date has already passed !")

    if len(slot.appointments) >= slot.max_bookings:
        raise HTTPException(status_code=400, detail="This slot is full !")

    email = payload.student_email.strip().lower()
    already_booked = db.query(Appointments).filter(
        Appointments.avaliable_id == avaliable_id,
        Appointments.student_email == email,
    ).first()
    if already_booked:
        raise HTTPException(status_code=400, detail="You already booked this slot !")

    new_appointment = Appointments(
        course_id=course_id,
        avaliable_id=avaliable_id,
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
        "avaliable_id": new_appointment.avaliable_id,
        "student_first_name": new_appointment.student_first_name,
        "student_last_name": new_appointment.student_last_name,
        "student_email": new_appointment.student_email,
        "appointments_description": new_appointment.appointments_description,
        "avaliable_date": str(slot.avaliable_date),
        "start_time": str(slot.start_time),
        "end_time": str(slot.end_time),
    }
