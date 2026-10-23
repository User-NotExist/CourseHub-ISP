import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, Course, CourseMember, Faq

# Staff (lecturer / TA) endpoints, require authentication
router = APIRouter(prefix="/course/{course_id}/faqs", tags=["faq"])

# Student endpoints, no authentication, read only
student_router = APIRouter(prefix="/student/course/{course_id}/faqs", tags=["faq_student"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class FaqCreate(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None


def get_current_user(access_token, db):
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


def get_staff_membership(course_id, user, db):
    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Only lecturer or TA can access FAQs !")
    return membership


def get_faq(course_id, faq_id, db):
    faq = db.query(Faq).filter(
        Faq.faq_id == faq_id,
        Faq.course_id == course_id,
    ).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found !")
    return faq


def faq_data(faq):
    return {
        "faq_id": faq.faq_id,
        "faq_owner_id": faq.user_id,
        "creator": faq.user.name,
        "title": faq.faq_name,
        "description": faq.faq_description,
        "createdAt": str(faq.createdAt),
    }


# STAFF
# Lecturer or TA can create
@router.post("/create")
async def create_faq(
    course_id: str,
    payload: FaqCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    get_staff_membership(course_id, user, db)

    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Title is required !")

    new_faq = Faq(
        user_id=user.user_id,
        course_id=course_id,
        faq_name=payload.title.strip(),
        faq_description=payload.description,
    )
    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)

    return faq_data(new_faq)


# Display all course's FAQs
@router.get("/read")
async def display_faqs(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    membership = get_staff_membership(course_id, user, db)
    is_lecturer = membership.role == "lecturer"

    all_faqs = (
        db.query(Faq)
        .filter(Faq.course_id == course_id)
        .order_by(Faq.createdAt.desc())
        .all()
    )

    faqs = []
    for f in all_faqs:
        faqs.append({
            **faq_data(f),
            "can_edit": f.user_id == user.user_id or is_lecturer,
        })

    return faqs


# For FAQ edit
@router.get("/read/{faq_id}")
async def display_faq(
    course_id: str,
    faq_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    membership = get_staff_membership(course_id, user, db)
    faq = get_faq(course_id, faq_id, db)

    return {
        **faq_data(faq),
        "can_edit": faq.user_id == user.user_id or membership.role == "lecturer",
    }


# FAQ creator or lecturer can edit
@router.put("/edit/{faq_id}")
async def edit_faq(
    course_id: str,
    faq_id: int,
    payload: FaqCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    membership = get_staff_membership(course_id, user, db)
    faq = get_faq(course_id, faq_id, db)

    if faq.user_id != user.user_id and membership.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only the FAQ creator or lecturer can edit this FAQ !")

    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Title is required !")

    faq.faq_name = payload.title.strip()
    faq.faq_description = payload.description

    db.commit()
    db.refresh(faq)

    return faq_data(faq)


# FAQ creator or lecturer can delete
@router.delete("/delete/{faq_id}")
async def delete_faq(
    course_id: str,
    faq_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    membership = get_staff_membership(course_id, user, db)
    faq = get_faq(course_id, faq_id, db)

    if faq.user_id != user.user_id and membership.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only the FAQ creator or lecturer can delete this FAQ !")

    db.delete(faq)
    db.commit()

    return {"faq_id": faq_id, "deleted": True}


# STUDENT
# No authentication, view only
@student_router.get("/read")
async def student_display_faqs(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    all_faqs = (
        db.query(Faq)
        .filter(Faq.course_id == course_id)
        .order_by(Faq.createdAt.desc())
        .all()
    )

    return [faq_data(f) for f in all_faqs]


@student_router.get("/read/{faq_id}")
async def student_display_faq(course_id: str, faq_id: int, db: Session = Depends(get_db)):
    faq = get_faq(course_id, faq_id, db)
    return faq_data(faq)
