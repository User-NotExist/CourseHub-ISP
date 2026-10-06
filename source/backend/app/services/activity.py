"""Activity operations and course membership permissions."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Activity, Course, User
from app.schemas.activity import ActivityCreate, ActivityEdit
from app.services.permissions import course_membership


def activity_member(course_id: str, user: User, db: Session):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    membership = course_membership(db, course_id, user.user_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Only course members can view activities")
    return user, membership


def activity_editor(course_id: str, user: User, db: Session):
    user, membership = activity_member(course_id, user, db)
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


def list_activities(
    course_id: str,
    user: User,
    db: Session,
):
    activity_member(course_id, user, db)
    return db.query(Activity).filter(Activity.course_id == course_id).order_by(Activity.activity_id).all()


def create_activity(
    course_id: str,
    payload: ActivityCreate,
    user: User,
    db: Session,
):
    user = activity_editor(course_id, user, db)
    activity = Activity(course_id=course_id, user_id=user.user_id, **payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def edit_activity(
    course_id: str,
    activity_id: int,
    payload: ActivityEdit,
    user: User,
    db: Session,
):
    activity_editor(course_id, user, db)
    activity = course_activity(course_id, activity_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return activity


def delete_activity(
    course_id: str,
    activity_id: int,
    user: User,
    db: Session,
):
    activity_editor(course_id, user, db)
    activity = course_activity(course_id, activity_id, db)
    db.delete(activity)
    db.commit()
    return {"course_id": course_id, "activity_id": activity_id, "deleted": True}
