import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from typing import Optional, Literal, List

from sqlalchemy import or_, cast, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

import string, secrets

from db.database import get_db
from db.models import User, Course, CourseMember, Task, Activity, Faq, Comments

router = APIRouter(prefix="/course/{course_id}/overview", tags=["overview"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


@router.get("/get_num_lec_ta")
async def display_me_tasks(
        course_id: str,
        access_token: Optional[str] = Cookie(None),
        db: Session = Depends(get_db)
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

    ta = db.query(CourseMember).filter(CourseMember.course_id == course_id, CourseMember.role == "ta").count()
    lec = db.query(CourseMember).filter(CourseMember.course_id == course_id, CourseMember.role == "lecturer").count()

    return {"num_ta": ta, "num_lec": lec}


@router.get("/get_title_description")
async def get_title_description(
        course_id: str,
        access_token: Optional[str] = Cookie(None),
        db: Session = Depends(get_db)
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

    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    return {"title": course.course_name, "description": course.course_description}


@router.get("/get_self_tasks")
async def get_self_tasks(
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

    tasks = db.query(Task).filter(Task.course_id == course_id).all()
    my_email = user.user_email.lower()

    # this user's assignment on the task (None if not assigned)
    def my_assignment(task):
        assignees = task.tasks if isinstance(task.tasks, list) else []
        return next(
            (a for a in assignees
             if isinstance(a, dict) and str(a.get("task_assignee_gmail", "")).lower() == my_email),
            None,
        )

    result = []
    for task in tasks:
        mine = my_assignment(task)
        if mine is None:
            continue
        result.append({
            "task_id": task.task_id,
            "task_name": task.task_name,
            "task_due_date": str(task.task_due_date),
            "status": mine.get("status", "To-Do"),
        })
    return result


@router.get("/get_activity_milestone")
async def get_activity_milestone(
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

    activities = db.query(Activity).filter(Activity.course_id == course_id).all()

    return [
        {
            "activity_id": a.activity_id,
            "activity_name": a.activity_name,
            "activity_type": a.activity_type,
            "activity_date": str(a.activity_date),
        }
        for a in activities
    ]


# keep : might use this for drow down when assigning something for ..
@router.get("/get_members_email_and_role")
async def get_members_email_and_role(
        course_id: str,
        access_token: Optional[str] = Cookie(None),
        db: Session = Depends(get_db)
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

    members = db.query(CourseMember).filter(CourseMember.course_id == course_id).all()
    result = []
    for member in members:
        user_info = db.query(User).filter(User.user_id == member.user_id).first()
        if user_info:
            if user_info.role == "ta":
                this_role = "Teaching Assistant"
            else:
                this_role = "Lecturer"
            result.append({"email": user_info.email, "role": this_role})

    return {"members": result}


