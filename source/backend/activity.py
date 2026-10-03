import os
from datetime import date, datetime, time
from typing import Literal, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, Course, CourseMember, User

router = APIRouter(prefix="/course/{course_id}/activities", tags=["activity"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ActivityType = Literal["Activities", "Milestones"]


class ActivityCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity_name: str = Field(min_length=1)
    activity_type: ActivityType
    activity_description: Optional[str] = None
    activity_date: Optional[date] = None
    activity_time: Optional[time] = None

    @field_validator("activity_name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Activity name is required")
        return value


class ActivityEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity_name: Optional[str] = Field(default=None, min_length=1)
    activity_type: Optional[ActivityType] = None
    activity_description: Optional[str] = None
    activity_date: Optional[date] = None
    activity_time: Optional[time] = None

    @field_validator("activity_name", "activity_type")
    @classmethod
    def validate_required_fields(cls, value):
        if value is None or not value.strip():
            raise ValueError("Activity name and type cannot be null or blank")
        return value.strip()


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: int
    user_id: int
    course_id: str
    activity_name: str
    activity_type: ActivityType
    activity_description: Optional[str]
    activity_date: Optional[date]
    activity_time: Optional[time]
    createdAt: datetime


def activity_member(course_id: str, access_token: Optional[str], db: Session):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Only course members can view activities")
    return user, membership


def activity_editor(course_id: str, access_token: Optional[str], db: Session):
    user, membership = activity_member(course_id, access_token, db)
    if membership.role not in ("lecturer", "ta"):
        raise HTTPException(status_code=403, detail="Only course lecturers and TAs can manage activities")
    return user


def course_activity(course_id: str, activity_id: int, db: Session):
    activity = db.query(Activity).filter(
        Activity.course_id == course_id, Activity.activity_id == activity_id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found in this course")
    return activity

# | GET | `/course/{course_id}/activities` | Return all course activities as an array, ordered by activity ID; returns `[]` if none exist. |
@router.get("", response_model=list[ActivityResponse])
async def list_activities(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    activity_member(course_id, access_token, db)
    return db.query(Activity).filter(Activity.course_id == course_id).order_by(Activity.activity_id).all()

# | POST | `/course/{course_id}/activities` | Create an activity; returns 201 and the saved activity. |
@router.post("", response_model=ActivityResponse, status_code=201)
async def create_activity(
    course_id: str,
    payload: ActivityCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = activity_editor(course_id, access_token, db)
    activity = Activity(course_id=course_id, user_id=user.user_id, **payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

# | PUT | `/course/{course_id}/activities/{activity_id}` | Edit an activity; returns the saved activity. |
@router.put("/{activity_id}", response_model=ActivityResponse)
async def edit_activity(
    course_id: str,
    activity_id: int,
    payload: ActivityEdit,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    activity_editor(course_id, access_token, db)
    activity = course_activity(course_id, activity_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return activity


# | DELETE | `/course/{course_id}/activities/{activity_id}` | Remove an activity; returns its IDs and `deleted: true`. |
@router.delete("/{activity_id}")
async def delete_activity(
    course_id: str,
    activity_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    activity_editor(course_id, access_token, db)
    activity = course_activity(course_id, activity_id, db)
    db.delete(activity)
    db.commit()
    return {"course_id": course_id, "activity_id": activity_id, "deleted": True}
