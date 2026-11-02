import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, Course, CourseMember, Announcement, Comments

# Staff (lecturer / TA) and admin endpoints, require authentication
router = APIRouter(prefix="/course/{course_id}/announcements", tags=["announcement"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None


class CommentCreate(BaseModel):
    comment: str = Field(min_length=1)


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


# Returns "admin", "lecturer" or "ta". Admin overrides course membership.
def get_course_role(course_id, user, db):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    if user.is_admin:
        return "admin"

    membership = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role.in_(["lecturer", "ta"]),
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Only lecturer, TA or admin can access announcements !")
    return membership.role


def require_lecturer(role):
    if role not in ["lecturer", "admin"]:
        raise HTTPException(status_code=403, detail="Only lecturer or admin can manage announcements !")


def get_announcement(course_id, announcement_id, db):
    announcement = db.query(Announcement).filter(
        Announcement.announcement_id == announcement_id,
        Announcement.course_id == course_id,
    ).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found !")
    return announcement


def get_comment(announcement, comment_id, db):
    comment = db.query(Comments).filter(
        Comments.comment_id == comment_id,
        Comments.announcement_id == announcement.announcement_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found !")
    return comment


def announcement_data(announcement):
    return {
        "announcement_id": announcement.announcement_id,
        "announcement_owner_id": announcement.user_id,
        "creator": announcement.user.name,
        "title": announcement.title,
        "description": announcement.description,
        "comment_count": len(announcement.comments),
        "createdAt": str(announcement.createdAt),
        "updatedAt": str(announcement.updatedAt),
    }


def comment_data(comment, user, role):
    is_owner = comment.user_id == user.user_id
    return {
        "comment_id": comment.comment_id,
        "comment_owner_id": comment.user_id,
        "creator": comment.user.name,
        "comment": comment.comment,
        "createdAt": str(comment.createdAt),
        "can_edit": is_owner or role == "admin",
        "can_delete": is_owner or role in ["lecturer", "admin"],
    }


def thread(announcement, user, role, db):
    all_comments = (
        db.query(Comments)
        .filter(Comments.announcement_id == announcement.announcement_id)
        .order_by(Comments.createdAt.asc(), Comments.comment_id.asc())
        .all()
    )
    return [comment_data(c, user, role) for c in all_comments]


# ANNOUNCEMENT
# Lecturer or admin can create
@router.post("/create")
async def create_announcement(
    course_id: str,
    payload: AnnouncementCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_lecturer(get_course_role(course_id, user, db))

    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Title is required !")

    new_announcement = Announcement(
        user_id=user.user_id,
        course_id=course_id,
        title=payload.title.strip(),
        description=payload.description,
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)

    return announcement_data(new_announcement)


# Display all course's announcements
@router.get("/read")
async def display_announcements(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_course_role(course_id, user, db)

    all_announcements = (
        db.query(Announcement)
        .filter(Announcement.course_id == course_id)
        .order_by(Announcement.createdAt.desc(), Announcement.announcement_id.desc())
        .all()
    )

    return [
        {**announcement_data(a), "can_edit": role in ["lecturer", "admin"]}
        for a in all_announcements
    ]


# Announcement detail with comment thread
@router.get("/read/{announcement_id}")
async def display_announcement(
    course_id: str,
    announcement_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_course_role(course_id, user, db)
    announcement = get_announcement(course_id, announcement_id, db)

    return {
        **announcement_data(announcement),
        "can_edit": role in ["lecturer", "admin"],
        "comments": thread(announcement, user, role, db),
    }


# Lecturer or admin can edit
@router.put("/edit/{announcement_id}")
async def edit_announcement(
    course_id: str,
    announcement_id: int,
    payload: AnnouncementCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_lecturer(get_course_role(course_id, user, db))
    announcement = get_announcement(course_id, announcement_id, db)

    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Title is required !")

    announcement.title = payload.title.strip()
    announcement.description = payload.description

    db.commit()
    db.refresh(announcement)

    return announcement_data(announcement)


# Lecturer or admin can delete, comments are deleted with it
@router.delete("/delete/{announcement_id}")
async def delete_announcement(
    course_id: str,
    announcement_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_lecturer(get_course_role(course_id, user, db))
    announcement = get_announcement(course_id, announcement_id, db)

    db.query(Comments).filter(Comments.announcement_id == announcement_id).delete()
    db.delete(announcement)
    db.commit()

    return {"announcement_id": announcement_id, "deleted": True}


# COMMENT
# Lecturer, TA or admin can comment
@router.post("/{announcement_id}/comments/create")
async def create_comment(
    course_id: str,
    announcement_id: int,
    payload: CommentCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_course_role(course_id, user, db)
    announcement = get_announcement(course_id, announcement_id, db)

    if not payload.comment.strip():
        raise HTTPException(status_code=422, detail="Comment is required !")

    new_comment = Comments(
        user_id=user.user_id,
        course_id=course_id,
        announcement_id=announcement.announcement_id,
        comment=payload.comment.strip(),
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return comment_data(new_comment, user, role)


@router.get("/{announcement_id}/comments/read")
async def display_comments(
    course_id: str,
    announcement_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_course_role(course_id, user, db)
    announcement = get_announcement(course_id, announcement_id, db)

    return thread(announcement, user, role, db)


# Comment creator or admin can edit
@router.put("/{announcement_id}/comments/edit/{comment_id}")
async def edit_comment(
    course_id: str,
    announcement_id: int,
    comment_id: int,
    payload: CommentCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_course_role(course_id, user, db)
    announcement = get_announcement(course_id, announcement_id, db)
    comment = get_comment(announcement, comment_id, db)

    if comment.user_id != user.user_id and role != "admin":
        raise HTTPException(status_code=403, detail="Only the comment creator or admin can edit this comment !")

    if not payload.comment.strip():
        raise HTTPException(status_code=422, detail="Comment is required !")

    comment.comment = payload.comment.strip()

    db.commit()
    db.refresh(comment)

    return comment_data(comment, user, role)


# Comment creator, lecturer or admin can delete
@router.delete("/{announcement_id}/comments/delete/{comment_id}")
async def delete_comment(
    course_id: str,
    announcement_id: int,
    comment_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    role = get_course_role(course_id, user, db)
    announcement = get_announcement(course_id, announcement_id, db)
    comment = get_comment(announcement, comment_id, db)

    if comment.user_id != user.user_id and role not in ["lecturer", "admin"]:
        raise HTTPException(status_code=403, detail="Only the comment creator, lecturer or admin can delete this comment !")

    db.delete(comment)
    db.commit()

    return {"comment_id": comment_id, "deleted": True}
