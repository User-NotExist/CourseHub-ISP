import os
from datetime import date, time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Cookie
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, CourseMember, Appointments, AppointmentsAvaliable

router = APIRouter(prefix="/course/{course_id}/appointments", tags=["appointments"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class AppointmentHead(BaseModel):
    lecturer: List[str] = []
    ta: List[str] = []


class AppointmentAvaliableCreate(BaseModel):
    appointment_head: AppointmentHead
    avaliable_date: date
    start_time: time
    end_time: time
    notes: Optional[str] = None
    max_bookings: int = 5


def validate_slot(payload: AppointmentAvaliableCreate):
    if not payload.appointment_head.lecturer and not payload.appointment_head.ta:
        raise HTTPException(status_code=400, detail="At least one lecturer or TA is required !")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time !")

    if payload.max_bookings < 1:
        raise HTTPException(status_code=400, detail="Max bookings must be at least 1 !")


def slot_to_dict(s: AppointmentsAvaliable):
    return {
        "slot_owner_id": s.user_id,
        "avaliable_id": s.avaliable_id,
        "appointment_head": s.appointment_head,
        "avaliable_date": str(s.avaliable_date),
        "start_time": str(s.start_time),
        "end_time": str(s.end_time),
        "notes": s.notes,
        "max_bookings": s.max_bookings,
        "booked": len(s.appointments),
    }


# Lecturer or TA can create
@router.post("/avaliable/create")
async def create_appointment_avaliable(
    course_id: str,
    payload: AppointmentAvaliableCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    is_member = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Only lecturer or TA can create avaliable dates !")

    validate_slot(payload)

    new_slot = AppointmentsAvaliable(
        user_id=user.user_id,
        course_id=course_id,
        appointment_head=payload.appointment_head.model_dump(),
        avaliable_date=payload.avaliable_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
        max_bookings=payload.max_bookings,
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    return slot_to_dict(new_slot)


# Display all course's avaliable dates
@router.get("/avaliable/read")
async def display_appointments_avaliable(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    is_member = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Only lecturer or TA can view avaliable dates !")

    all_slots = (
        db.query(AppointmentsAvaliable)
        .filter(AppointmentsAvaliable.course_id == course_id)
        .order_by(AppointmentsAvaliable.avaliable_date, AppointmentsAvaliable.start_time)
        .all()
    )

    slots = []
    for s in all_slots:
        slot = slot_to_dict(s)
        slot["can_edit"] = True
        slots.append(slot)

    return slots


# For avaliable date edit, also shows who booked
@router.get("/avaliable/read/{avaliable_id}")
async def display_appointment_avaliable(
    course_id: str,
    avaliable_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    is_member = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Only lecturer or TA can view avaliable dates !")

    slot = db.query(AppointmentsAvaliable).filter(
        AppointmentsAvaliable.avaliable_id == avaliable_id,
        AppointmentsAvaliable.course_id == course_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Avaliable date not found !")

    result = slot_to_dict(slot)
    result["can_edit"] = True
    result["bookings"] = [
        {
            "appointment_id": a.appointment_id,
            "student_first_name": a.student_first_name,
            "student_last_name": a.student_last_name,
            "student_email": a.student_email,
            "appointments_description": a.appointments_description,
        }
        for a in slot.appointments
    ]

    return result


@router.put("/avaliable/edit/{avaliable_id}")
async def edit_appointment_avaliable(
    course_id: str,
    avaliable_id: int,
    payload: AppointmentAvaliableCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    slot = db.query(AppointmentsAvaliable).filter(
        AppointmentsAvaliable.avaliable_id == avaliable_id,
        AppointmentsAvaliable.course_id == course_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Avaliable date not found !")

    is_member = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first() is not None

    if not is_member:
        raise HTTPException(status_code=403, detail="Only lecturer or TA can edit avaliable dates !")

    validate_slot(payload)

    if payload.max_bookings < len(slot.appointments):
        raise HTTPException(status_code=400, detail="Max bookings is less than current bookings !")

    slot.appointment_head = payload.appointment_head.model_dump()
    slot.avaliable_date = payload.avaliable_date
    slot.start_time = payload.start_time
    slot.end_time = payload.end_time
    slot.notes = payload.notes
    slot.max_bookings = payload.max_bookings

    db.commit()
    db.refresh(slot)

    return slot_to_dict(slot)


@router.delete("/avaliable/delete/{avaliable_id}")
async def delete_appointment_avaliable(
    course_id: str,
    avaliable_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    slot = db.query(AppointmentsAvaliable).filter(
        AppointmentsAvaliable.avaliable_id == avaliable_id,
        AppointmentsAvaliable.course_id == course_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Avaliable date not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    if not is_lecturer:
        raise HTTPException(status_code=403, detail="Only lecturer can delete avaliable dates !")

    # no cascade, so delete bookings from students first
    db.query(Appointments).filter(Appointments.avaliable_id == avaliable_id).delete()
    db.delete(slot)
    db.commit()

    return {"avaliable_id": avaliable_id, "deleted": True}
