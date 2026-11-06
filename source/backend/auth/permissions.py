from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from db.models import Course, CourseMember, User

STAFF_ROLES = ("lecturer", "ta")
# Roles allowed to manage everything in a course (edit / delete other people's items).
MANAGER_ROLES = ("lecturer", "admin")


def course_role(
    course_id: str,
    user: User,
    db: Session,
    roles: Optional[Iterable[str]] = None,
    detail: str = "You don't have permission for this course !",
) -> str:
    """Return the user's role in the course: "admin", "lecturer", "ta" or "student".

    Admins override course membership (404 if the course doesn't exist).
    Everyone else must be a member, with one of `roles` if given, or get 403.
    """
    if user.is_admin:
        if not db.query(Course).filter(Course.course_id == course_id).first():
            raise HTTPException(status_code=404, detail="Course not found !")
        return "admin"

    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
    ).first()
    if not membership or (roles is not None and membership.role not in roles):
        raise HTTPException(status_code=403, detail=detail)
    return membership.role


def is_lecturer_or_admin(course_id: str, user: User, db: Session) -> bool:
    if user.is_admin:
        return True
    return db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None
