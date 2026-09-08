import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional

import string, secrets

from database import get_db
from models import User, Course, CourseMember

router = APIRouter(prefix="/course", tags=["course"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class CourseCreate(BaseModel):
    course_name: str
    course_description: Optional[str] = None
    course_thumbnail: Optional[str] = None

@router.post("/create")
async def create_course(
    payload: CourseCreate,
    access_token: str = Cookie(None),
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

    lecturer_unq = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))
    ta_unq = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))
    student_unq = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))

    new_course = Course(
        course_unique_for_lecturer=lecturer_unq,
        course_unique_for_ta=ta_unq,
        course_unique_for_student=student_unq,
        course_name=payload.course_name,
        course_description=payload.course_description,
        course_thumbnail=payload.course_thumbnail,
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)

    membership = CourseMember(
        user_id=user.user_id,
        course_id=new_course.course_id,
        role="lecturer",
    )
    db.add(membership)
    db.commit()

    return {
        "course_id": new_course.course_id,
        "course_name": new_course.course_name,
        "course_description": new_course.course_description,
        "course_picture_path": new_course.course_thumbnail,
    }