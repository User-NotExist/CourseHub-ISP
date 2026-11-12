from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, Course, CourseMember, Faq
from auth.permissions import STAFF_ROLES, MANAGER_ROLES, course_role
from auth.current_user import get_current_user

# Staff (lecturer / TA) endpoints, require authentication
router = APIRouter(prefix="/course/{course_id}/faqs", tags=["faq"])

# Student endpoints, no authentication, read only
student_router = APIRouter(prefix="/student/course/{course_id}/faqs", tags=["faq_student"])

class FaqCreate(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None


# Returns "admin", "lecturer" or "ta". Admin overrides course membership.
def get_staff_role(course_id, user, db):
    return course_role(course_id, user, db, roles=STAFF_ROLES, detail="Only lecturer, TA or admin can access FAQs !")


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
    get_staff_role(course_id, user, db)

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
    role = get_staff_role(course_id, user, db)
    is_lecturer = role in MANAGER_ROLES

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
    role = get_staff_role(course_id, user, db)
    faq = get_faq(course_id, faq_id, db)

    return {
        **faq_data(faq),
        "can_edit": faq.user_id == user.user_id or role in MANAGER_ROLES,
    }


# FAQ creator, lecturer or admin can edit
@router.put("/edit/{faq_id}")
async def edit_faq(
    course_id: str,
    faq_id: int,
    payload: FaqCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_staff_role(course_id, user, db)
    faq = get_faq(course_id, faq_id, db)

    if faq.user_id != user.user_id and role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only the FAQ creator, lecturer or admin can edit this FAQ !")

    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Title is required !")

    faq.faq_name = payload.title.strip()
    faq.faq_description = payload.description

    db.commit()
    db.refresh(faq)

    return faq_data(faq)


# FAQ creator, lecturer or admin can delete
@router.delete("/delete/{faq_id}")
async def delete_faq(
    course_id: str,
    faq_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_staff_role(course_id, user, db)
    faq = get_faq(course_id, faq_id, db)

    if faq.user_id != user.user_id and role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only the FAQ creator, lecturer or admin can delete this FAQ !")

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
