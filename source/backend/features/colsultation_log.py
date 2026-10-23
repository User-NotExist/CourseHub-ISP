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
    consultation_with_studentID: Optional[str] = None
    consultation_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


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

    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this course !")
    if membership.role not in ("lecturer", "ta"):
        raise HTTPException(status_code=403, detail="Only lecturer or TA can create consultation logs !")

    new_log = ConsultationLogs(
        user_id=user.user_id,
        course_id=course_id,
        title=payload.title,
        description=payload.description,
        consultation_with_studentID=payload.consultation_with_studentID,
        consultation_date=payload.consultation_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {
        "consultation_id": new_log.consultation_id,
        "user_id": new_log.user_id,
        "course_id": new_log.course_id,
        "title": new_log.title,
        "description": new_log.description,
        "consultation_with_studentID": new_log.consultation_with_studentID,
        "consultation_date": str(new_log.consultation_date) if new_log.consultation_date else None,
        "start_time": str(new_log.start_time) if new_log.start_time else None,
        "end_time": str(new_log.end_time) if new_log.end_time else None,
    }
