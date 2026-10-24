import os
from datetime import date, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, CourseMember, ConsultationLogs

router = APIRouter(prefix="/course/{course_id}/consultation_logs", tags=["consul_logs"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class ConsultationLogCreate(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None
    consultant: Optional[str] = None  # consultant's email (must be a member of the course)
    consultation_with_name: Optional[str] = None
    consultation_with_id: Optional[str] = None
    consultation_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


def get_current_user(access_token: Optional[str], db: Session) -> User:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")
    return user


def get_staff_membership(course_id: str, user: User, db: Session, action: str) -> CourseMember:
    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail=f"Only lecturer or TA can {action} consultation logs !")
    return membership


def is_course_lecturer(course_id: str, user: User, db: Session) -> bool:
    return db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None


def normalize_consultant_email(course_id: str, email: str, db: Session) -> str:
    """Return the consultant's email as stored on their user record, after checking
    that they belong to this course."""
    email = email.strip()
    consultant_user = db.query(User).filter(func.lower(User.user_email) == email.lower()).first()
    in_course = consultant_user is not None and db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == consultant_user.user_id,
    ).first() is not None
    if not in_course:
        raise HTTPException(status_code=400, detail="Consultant must be a member of this course !")
    return consultant_user.user_email


def serialize_log(log: ConsultationLogs, consultant_names: dict[str, str]) -> dict:
    consultant = None
    if log.consultant:
        consultant = {
            "email": log.consultant,
            "name": consultant_names.get(log.consultant.lower(), log.consultant),
        }

    return {
        "log_owner_id": log.user_id,
        "consultation_id": log.consultation_id,
        "title": log.title,
        "description": log.description,
        "consultant": consultant,
        "consultation_with_name": log.consultation_with_name,
        "consultation_with_id": log.consultation_with_id,
        "consultation_date": log.consultation_date.isoformat() if log.consultation_date else None,
        "start_time": log.start_time.isoformat() if log.start_time else None,
        "end_time": log.end_time.isoformat() if log.end_time else None,
    }


def consultant_name_lookup(logs: list[ConsultationLogs], db: Session) -> dict[str, str]:
    emails = {l.consultant.lower() for l in logs if l.consultant}
    if not emails:
        return {}
    users = db.query(User).filter(func.lower(User.user_email).in_(emails)).all()
    return {u.user_email.lower(): u.name for u in users}


# Lecturer or TA can create
@router.post("/create")
async def create_consultation_log(
    course_id: str,
    payload: ConsultationLogCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    get_staff_membership(course_id, user, db, "create")

    consultant_email = normalize_consultant_email(
        course_id, payload.consultant or user.user_email, db
    )

    new_log = ConsultationLogs(
        user_id=user.user_id,
        course_id=course_id,
        title=payload.title.strip(),
        description=payload.description,
        consultation_with_name=payload.consultation_with_name,
        consultation_with_id=payload.consultation_with_id,
        consultation_date=payload.consultation_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        consultant=consultant_email,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return serialize_log(new_log, consultant_name_lookup([new_log], db))


# Display all course's consultation logs
@router.get("/read")
async def display_consultation_logs(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    membership = get_staff_membership(course_id, user, db, "view")

    all_logs = (
        db.query(ConsultationLogs)
        .filter(ConsultationLogs.course_id == course_id)
        .order_by(ConsultationLogs.consultation_date.desc(), ConsultationLogs.consultation_id.desc())
        .all()
    )

    names = consultant_name_lookup(all_logs, db)
    is_lecturer = membership.role == "lecturer"

    return [
        {**serialize_log(l, names), "can_edit": l.user_id == user.user_id or is_lecturer}
        for l in all_logs
    ]


# For consultation log detail / edit
@router.get("/read/{consultation_id}")
async def display_consultation_log(
    course_id: str,
    consultation_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    membership = get_staff_membership(course_id, user, db, "view")

    log = db.query(ConsultationLogs).filter(
        ConsultationLogs.consultation_id == consultation_id,
        ConsultationLogs.course_id == course_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Consultation log not found !")

    can_edit = log.user_id == user.user_id or membership.role == "lecturer"
    return {**serialize_log(log, consultant_name_lookup([log], db)), "can_edit": can_edit}


@router.put("/edit/{consultation_id}")
async def edit_consultation_log(
    course_id: str,
    consultation_id: int,
    payload: ConsultationLogCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)

    log = db.query(ConsultationLogs).filter(
        ConsultationLogs.consultation_id == consultation_id,
        ConsultationLogs.course_id == course_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Consultation log not found !")

    if log.user_id != user.user_id and not is_course_lecturer(course_id, user, db):
        raise HTTPException(status_code=403, detail="Only the log owner or lecturer can edit this log !")

    # Keep the current consultant unless a new one was supplied
    if payload.consultant:
        log.consultant = normalize_consultant_email(course_id, payload.consultant, db)

    log.title = payload.title.strip()
    log.description = payload.description
    log.consultation_with_name = payload.consultation_with_name
    log.consultation_with_id = payload.consultation_with_id
    log.consultation_date = payload.consultation_date
    log.start_time = payload.start_time
    log.end_time = payload.end_time

    db.commit()
    db.refresh(log)

    return serialize_log(log, consultant_name_lookup([log], db))


@router.delete("/delete/{consultation_id}")
async def delete_consultation_log(
    course_id: str,
    consultation_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)

    log = db.query(ConsultationLogs).filter(
        ConsultationLogs.consultation_id == consultation_id,
        ConsultationLogs.course_id == course_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Consultation log not found !")

    if log.user_id != user.user_id and not is_course_lecturer(course_id, user, db):
        raise HTTPException(status_code=403, detail="Only the log owner or lecturer can delete this log !")

    db.delete(log)
    db.commit()

    return {"consultation_id": consultation_id, "deleted": True}