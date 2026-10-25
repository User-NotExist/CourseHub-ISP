import os
from datetime import date, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, CourseMember, ConsultationLogs

router = APIRouter(prefix="/course/{course_id}/consultation_logs", tags=["consul_logs"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class ConsultationLogCreate(BaseModel):
    title: str
    description: Optional[str] = None
    consultation_with_name: Optional[str] = None
    consultation_with_id: Optional[str] = None
    consultant: Optional[str] = None
    consultation_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


# Lecturer or TA can create
@router.post("/create")
async def create_consultation_log(
    course_id: str,
    payload: ConsultationLogCreate,
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
        raise HTTPException(status_code=403, detail="Only lecturer or TA can create consultation logs !")

    new_log = ConsultationLogs(
        user_id=user.user_id,
        course_id=course_id,
        title=payload.title,
        description=payload.description,
        consultation_with_name=payload.consultation_with_name,
        consultation_with_id=payload.consultation_with_id,
        consultant=payload.consultant,
        consultation_date=payload.consultation_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {
        "log_owner_id": new_log.user_id,
        "consultation_id": new_log.consultation_id,
        "title": new_log.title,
        "description": new_log.description,
        "consultation_with_name": new_log.consultation_with_name,
        "consultation_with_id": new_log.consultation_with_id,
        "consultant": new_log.consultant,
        "consultation_date": str(new_log.consultation_date),
        "start_time": str(new_log.start_time),
        "end_time": str(new_log.end_time),
    }


# Display all course's consultation logs
@router.get("/read")
async def display_consultation_logs(
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
        raise HTTPException(status_code=403, detail="Only lecturer or TA can view consultation logs !")

    all_logs = (
        db.query(ConsultationLogs)
        .filter(ConsultationLogs.course_id == course_id)
        .all()
    )

    is_lecturer = is_member.role == "lecturer"

    logs = []
    for l in all_logs:
        logs.append({
            "log_owner_id": l.user_id,
            "consultation_id": l.consultation_id,
            "title": l.title,
            "description": l.description,
            "consultation_with_name": l.consultation_with_name,
            "consultation_with_id": l.consultation_with_id,
            "consultant": l.consultant,
            "consultation_date": str(l.consultation_date),
            "start_time": str(l.start_time),
            "end_time": str(l.end_time),
            "can_edit": l.user_id == user.user_id or is_lecturer,
        })

    return logs


# For consultation log edit
@router.get("/read/{consultation_id}")
async def display_consultation_log(
    course_id: str,
    consultation_id: int,
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
        raise HTTPException(status_code=403, detail="Only lecturer or TA can view consultation logs !")

    log = db.query(ConsultationLogs).filter(
        ConsultationLogs.consultation_id == consultation_id,
        ConsultationLogs.course_id == course_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Consultation log not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    return {
        "log_owner_id": log.user_id,
        "consultation_id": log.consultation_id,
        "title": log.title,
        "description": log.description,
        "consultation_with_name": log.consultation_with_name,
        "consultation_with_id": log.consultation_with_id,
        "consultant": log.consultant,
        "consultation_date": str(log.consultation_date),
        "can_edit": log.user_id == user.user_id or is_lecturer,
        "start_time": str(log.start_time),
        "end_time": str(log.end_time),
    }


@router.put("/edit/{consultation_id}")
async def edit_consultation_log(
    course_id: str,
    consultation_id: int,
    payload: ConsultationLogCreate,
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

    log = db.query(ConsultationLogs).filter(
        ConsultationLogs.consultation_id == consultation_id,
        ConsultationLogs.course_id == course_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Consultation log not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    if log.user_id != user.user_id and not is_lecturer:
        raise HTTPException(status_code=403, detail="Only the log owner or lecturer can edit this log !")

    log.title = payload.title
    log.description = payload.description
    log.consultation_with_name = payload.consultation_with_name
    log.consultation_with_id = payload.consultation_with_id
    log.consultant = payload.consultant
    log.consultation_date = payload.consultation_date
    log.start_time = payload.start_time
    log.end_time = payload.end_time

    db.commit()
    db.refresh(log)

    return {
        "log_owner_id": log.user_id,
        "consultation_id": log.consultation_id,
        "title": log.title,
        "description": log.description,
        "consultation_with_name": log.consultation_with_name,
        "consultation_with_id": log.consultation_with_id,
        "consultant": log.consultant,
        "consultation_date": str(log.consultation_date),
        "start_time": str(log.start_time),
        "end_time": str(log.end_time),
    }


@router.delete("/delete/{consultation_id}")
async def delete_consultation_log(
    course_id: str,
    consultation_id: int,
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

    log = db.query(ConsultationLogs).filter(
        ConsultationLogs.consultation_id == consultation_id,
        ConsultationLogs.course_id == course_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Consultation log not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    if log.user_id != user.user_id and not is_lecturer:
        raise HTTPException(status_code=403, detail="Only the log owner or lecturer can delete this log !")

    db.delete(log)
    db.commit()

    return {"consultation_id": consultation_id, "deleted": True}
