"""Course operations and lecturer/admin permissions."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.identifiers import random_identifier
from app.models import Activity, Comments, Course, CourseMember, Faq, Task, User
from app.schemas.course import CourseCreate, CourseEdit
from app.services.permissions import course_membership
from app.services.serializers import course_membership_data


def display_me_courses(user: User, db: Session):
    memberships = (
        db.query(CourseMember)
        .filter(CourseMember.user_id == user.user_id)
        .all()
    )

    return [course_membership_data(membership, user) for membership in memberships]


def create_course(
    payload: CourseCreate,
    user: User,
    db: Session,
):
    new_course = Course(
        course_id=random_identifier(12),
        course_unique_for_lecturer=random_identifier(10),
        course_unique_for_ta=random_identifier(10),
        course_unique_for_student=random_identifier(10),
        course_name=payload.course_name,
        course_description=payload.course_description,
        course_thumbnail=payload.course_thumbnail,
    )
    db.add(new_course)
    # Insert the course before its membership, but commit both together.
    db.flush()

    membership = CourseMember(
        user_id=user.user_id,
        course_id=new_course.course_id,
        role="lecturer",
    )
    db.add(membership)
    db.commit()
    db.refresh(new_course)

    return {
        "course_id": new_course.course_id,
        "course_name": new_course.course_name,
        "course_description": new_course.course_description,
        "course_picture_path": new_course.course_thumbnail,
    }


def editable_course(course_id: str, user: User, db: Session):
    # Serialize membership updates, including the last-lecturer check.
    course = db.query(Course).filter(Course.course_id == course_id).with_for_update().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    membership = course_membership(db, course_id, user.user_id)
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


def read_course_for_edit(course_id: str, user: User, db: Session):
    course = editable_course(course_id, user, db)
    return course_editor_data(course, db)


def edit_course(payload: CourseEdit, user: User, db: Session):
    course = editable_course(payload.course_id, user, db)
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


def delete_course(
    course_id: str,
    user: User,
    db: Session,
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    membership = course_membership(db, course_id, user.user_id)
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
