"""Shared membership queries; services decide which roles are allowed."""
from sqlalchemy.orm import Session

from app.models import CourseMember


def course_membership(db: Session, course_id: str, user_id: int) -> CourseMember | None:
    return db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user_id,
    ).first()


def is_course_lecturer(db: Session, course_id: str, user_id: int) -> bool:
    return db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user_id,
        CourseMember.role == "lecturer",
    ).first() is not None
