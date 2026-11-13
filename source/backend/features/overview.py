from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from sqlalchemy import or_
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, Course, CourseMember, Task, Activity
from auth.permissions import course_role
from auth.current_user import get_current_user

router = APIRouter(prefix="/course/{course_id}/overview", tags=["overview"])


STAFF_ROLES = ["lecturer", "ta"]
ROLE_LABELS = {"lecturer": "Lecturer", "ta": "Teaching Assistant"}


def require_member(db: Session, user: User, course_id: str, roles: Optional[list] = None) -> str:
    """User must be in this course (and have one of `roles`, if given), or be an admin.
    Returns the role ("admin" for admins)."""
    return course_role(course_id, user, db, roles=roles)


@router.get("/get_num_lec_ta")
async def get_num_lec_ta(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_member(db, user, course_id)

    ta = db.query(CourseMember).filter(CourseMember.course_id == course_id, CourseMember.role == "ta").count()
    lec = db.query(CourseMember).filter(CourseMember.course_id == course_id, CourseMember.role == "lecturer").count()

    return {"num_ta": ta, "num_lec": lec}


@router.get("/get_title_description")
async def get_title_description(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_member(db, user, course_id, STAFF_ROLES)

    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found !")

    return {"title": course.course_name, "description": course.course_description}


@router.get("/get_self_tasks_in_this_course")
async def get_self_tasks_in_this_course(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_member(db, user, course_id)

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
    user = get_current_user(access_token, db)
    require_member(db, user, course_id)

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


# keep : might use this for drop down when assigning something
@router.get("/get_members_email_and_role")
async def get_members_email_and_role(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)
    require_member(db, user, course_id, STAFF_ROLES)

    rows = (
        db.query(User.user_email, CourseMember.role)
        .join(CourseMember, CourseMember.user_id == User.user_id)
        .filter(CourseMember.course_id == course_id)
        .all()
    )

    return {
        "members": [
            {"email": email, "role": ROLE_LABELS.get(role, role)}
            for email, role in rows
        ]
    }


# ---------- Main page (all courses) ----------
all_courses_router = APIRouter(prefix="/overview", tags=["overview"])


def find_my_assignment(task: Task, my_email: str):
    """Return this user's assignment dict on the task, or None if not assigned."""
    assignees = task.tasks if isinstance(task.tasks, list) else []
    return next(
        (a for a in assignees
         if isinstance(a, dict) and str(a.get("task_assignee_gmail", "")).lower() == my_email),
        None,
    )


@all_courses_router.get("/all_courses")
async def get_all_courses_overview(
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(access_token, db)

    memberships = db.query(CourseMember).filter(CourseMember.user_id == user.user_id).all()
    course_ids = [m.course_id for m in memberships]
    if not course_ids:
        return {"tasks": [], "activities": []}

    course_names = {
        c.course_id: c.course_name
        for c in db.query(Course).filter(Course.course_id.in_(course_ids)).all()
    }
    my_email = user.user_email.lower()

    tasks = []
    for task in db.query(Task).filter(Task.course_id.in_(course_ids)).all():
        mine = find_my_assignment(task, my_email)
        if mine is None:
            continue
        tasks.append({
            "task_id": task.task_id,
            "task_name": task.task_name,
            "task_due_date": str(task.task_due_date),
            "status": mine.get("status", "To-Do"),
            "course_id": task.course_id,
            "course_name": course_names.get(task.course_id, ""),
        })

    activities = [
        {
            "activity_id": a.activity_id,
            "activity_name": a.activity_name,
            "activity_type": a.activity_type,
            "activity_date": str(a.activity_date),
            "course_id": a.course_id,
            "course_name": course_names.get(a.course_id, ""),
        }
        for a in db.query(Activity).filter(Activity.course_id.in_(course_ids)).all()
    ]

    return {"tasks": tasks, "activities": activities}

@all_courses_router.get("/agenda")
async def get_agenda(
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    """Calendar data: activities/milestones of the user's courses + tasks assigned to them.
    Admins get every task and activity of every (non-archived) course."""
    user = get_current_user(access_token, db)

    course_query = db.query(Course).filter(
        or_(Course.course_status.is_(None), Course.course_status != "archived")
    )
    if not user.is_admin:
        course_query = course_query.join(
            CourseMember, CourseMember.course_id == Course.course_id
        ).filter(CourseMember.user_id == user.user_id)

    course_names = {c.course_id: c.course_name for c in course_query.all()}
    if not course_names:
        return {"is_admin": bool(user.is_admin), "tasks": [], "activities": []}
    course_ids = list(course_names.keys())
    my_email = user.user_email.lower()

    tasks = []
    for task in db.query(Task).filter(Task.course_id.in_(course_ids), Task.task_due_date.isnot(None)).all():
        mine = find_my_assignment(task, my_email)
        if mine is None and not user.is_admin:
            continue
        tasks.append({
            "task_id": task.task_id,
            "task_name": task.task_name,
            "task_description": task.task_description,
            "task_due_date": str(task.task_due_date),
            "course_id": task.course_id,
            "course_name": course_names.get(task.course_id, ""),
            "my_status": mine.get("status", "To-Do") if mine else None,
            "assignees": task.tasks if isinstance(task.tasks, list) else [],
        })

    activities = [
        {
            "activity_id": a.activity_id,
            "activity_name": a.activity_name,
            "activity_type": a.activity_type,
            "activity_description": a.activity_description,
            "activity_date": str(a.activity_date),
            "activity_time": a.activity_time.strftime("%H:%M") if a.activity_time else None,
            "course_id": a.course_id,
            "course_name": course_names.get(a.course_id, ""),
        }
        for a in db.query(Activity).filter(Activity.course_id.in_(course_ids), Activity.activity_date.isnot(None)).all()
    ]

    return {"is_admin": bool(user.is_admin), "tasks": tasks, "activities": activities}
