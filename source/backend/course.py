import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from typing import Optional, Literal

import string, secrets

from database import get_db
from models import User, Course, CourseMember, Task, Activity, Faq, Comments

router = APIRouter(prefix="/course", tags=["course"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


@router.get("/display-course")
async def display_me_courses(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    memberships = (
        db.query(CourseMember)
        .filter(CourseMember.user_id == user.user_id)
        .all()
    )

    courses = []
    for i in memberships:
        course = i.course
        courses.append({
            "course_id": course.course_id,
            "course_unique_for_lecturer": course.course_unique_for_lecturer,
            "course_unique_for_ta": course.course_unique_for_ta,
            "course_unique_for_student": course.course_unique_for_student,
            "course_name": course.course_name,
            "course_description": course.course_description,
            "course_thumbnail": course.course_thumbnail,
            "createdAt": str(course.createdAt),
            "role": i.role,
            "can_edit": user.is_admin or i.role == "lecturer",
        })

    return courses


class CourseCreate(BaseModel):
    course_name: str
    course_description: Optional[str] = None
    course_thumbnail: Optional[str] = None


class MemberEdit(BaseModel):
    email: str
    role: Literal["lecturer", "ta"]


class CourseEdit(BaseModel):
    course_id: str
    course_name: str = Field(min_length=1)
    course_description: str = Field(min_length=1, max_length=70)
    members: Optional[list[MemberEdit]] = None

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

    course_id_here = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    lecturer_unq = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
    ta_unq = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
    student_unq = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))

    new_course = Course(
        course_id=course_id_here,
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


def editable_course(course_id, access_token, db):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(token_payload["sub"])
    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Serialize membership updates, including the last-lecturer check.
    course = db.query(Course).filter(Course.course_id == course_id).with_for_update().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id, CourseMember.user_id == user_id,
    ).first()
    if not user.is_admin and (not membership or membership.role != "lecturer"):
        raise HTTPException(status_code=403, detail="Only lecturers and administrators can edit this course")
    return course


def course_editor_data(course, db):
    members = db.query(CourseMember).filter(CourseMember.course_id == course.course_id).all()
    return {
        "course_id": course.course_id,
        "course_name": course.course_name,
        "course_description": course.course_description,
        "members": [
            {"email": member.user.user_email, "name": member.user.name, "role": member.role}
            for member in members
        ],
    }


@router.get("/edit/{course_id}")
async def read_course_for_edit(course_id: str, access_token: str = Cookie(None), db: Session = Depends(get_db)):
    course = editable_course(course_id, access_token, db)
    return course_editor_data(course, db)


@router.put("/edit")
async def edit_course(payload: CourseEdit, access_token: str = Cookie(None), db: Session = Depends(get_db)):
    course = editable_course(payload.course_id, access_token, db)
    if not payload.course_name.strip():
        raise HTTPException(status_code=422, detail="Course name is required")
    if not payload.course_description.strip():
        raise HTTPException(status_code=422, detail="Description is required")

    if payload.members is not None:
        if not any(member.role == "lecturer" for member in payload.members):
            raise HTTPException(status_code=422, detail="Keep at least one lecturer in the course")
        requested = {}
        for member in payload.members:
            email = member.email.strip().lower()
            if email in requested:
                raise HTTPException(status_code=422, detail="Each user can only be added once")
            user = db.query(User).filter(User.user_email == email).first()
            if not user:
                raise HTTPException(status_code=422, detail=f"No registered user found for {email}")
            requested[email] = (user, member.role)

        existing = db.query(CourseMember).filter(CourseMember.course_id == course.course_id).all()
        by_user = {member.user_id: member for member in existing}
        requested_ids = {user.user_id for user, role in requested.values()}
        for member in existing:
            if member.user_id not in requested_ids:
                db.delete(member)
        for user, role in requested.values():
            if user.user_id in by_user:
                by_user[user.user_id].role = role
            else:
                db.add(CourseMember(course_id=course.course_id, user_id=user.user_id, role=role))

    course.course_name = payload.course_name.strip()
    course.course_description = payload.course_description.strip()
    db.commit()
    return course_editor_data(course, db)


@router.delete("/delete/{course_id}")
async def delete_course(
    course_id: str,
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

    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    membership = (
        db.query(CourseMember)
        .filter(CourseMember.user_id == user.user_id, CourseMember.course_id == course_id)
        .first()
    )
    if not membership or membership.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only the lecturer can delete this course !")

    db.query(Task).filter(Task.course_id == course_id).delete()
    db.query(Activity).filter(Activity.course_id == course_id).delete()
    db.query(Faq).filter(Faq.course_id == course_id).delete()
    db.query(Comments).filter(Comments.course_id == course_id).delete()
    db.query(CourseMember).filter(CourseMember.course_id == course_id).delete()

    db.delete(course)
    db.commit()

    return {"course_id": course_id, "deleted": True}