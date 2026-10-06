"""Task operations, ownership checks, and assignee status updates."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Task, User
from app.schemas.task import TaskCreate, TaskStatusUpdate
from app.services.permissions import course_membership, is_course_lecturer
from app.services.serializers import task_data


def course_task(course_id: str, task_id: int, db: Session) -> Task:
    task = db.query(Task).filter(Task.task_id == task_id, Task.course_id == course_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found !")
    return task


def require_task_editor(task: Task, user: User, db: Session, action: str) -> None:
    is_lecturer = is_course_lecturer(db, task.course_id, user.user_id)
    if task.user_id != user.user_id and not is_lecturer:
        raise HTTPException(
            status_code=403,
            detail=f"Only the task owner or lecturer can {action} this task !",
        )


def create_task(
    course_id: str,
    payload: TaskCreate,
    user: User,
    db: Session,
):
    is_member = course_membership(db, course_id, user.user_id)
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this course !")

    new_task = Task(
        user_id=user.user_id,
        course_id=course_id,
        task_name=payload.task_name,
        task_description=payload.task_description,
        task_due_date=payload.task_due_date,
        tasks=[assignee.model_dump() for assignee in payload.task_assignee],
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return task_data(new_task)


def display_me_tasks(
    course_id: str,
    user: User,
    db: Session,
):
    membership = course_membership(db, course_id, user.user_id)
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this course !")

    tasks = (
        db.query(Task)
        .filter(Task.course_id == course_id)
        .all()
    )

    is_lecturer = is_course_lecturer(db, course_id, user.user_id)

    return [
        task_data(task, can_edit=task.user_id == user.user_id or is_lecturer)
        for task in tasks
    ]


def display_task(
    course_id: str,
    task_id: int,
    user: User,
    db: Session,
):
    return task_data(course_task(course_id, task_id, db))


def update_task_status(
    course_id: str,
    task_id: int,
    payload: TaskStatusUpdate,
    user: User,
    db: Session,
):
    task = course_task(course_id, task_id, db)

    is_lecturer = is_course_lecturer(db, course_id, user.user_id)
    is_owner = task.user_id == user.user_id

    target_email = payload.task_assignee_gmail or user.user_email
    assignments = task.tasks if isinstance(task.tasks, list) else []
    matching_assignment = next(
        (
            assignment
            for assignment in assignments
            if isinstance(assignment, dict)
            and str(assignment.get("task_assignee_gmail", "")).lower() == target_email.lower()
        ),
        None,
    )

    is_self_assignee = matching_assignment is not None and target_email.lower() == user.user_email.lower()

    if not (is_owner or is_lecturer or is_self_assignee):
        raise HTTPException(status_code=403, detail="Only the task owner, lecturer, or assignee can update status !")
    if not matching_assignment:
        raise HTTPException(status_code=404, detail="Assignee not found on this task !")

    updated_assignments = [dict(assignment) for assignment in assignments if isinstance(assignment, dict)]
    for assignment in updated_assignments:
        if str(assignment.get("task_assignee_gmail", "")).lower() == target_email.lower():
            assignment["status"] = payload.status
    task.tasks = updated_assignments
    db.commit()

    return {"task_id": task.task_id, "status": payload.status}


def edit_task(
    course_id: str,
    task_id: int,
    payload: TaskCreate,
    user: User,
    db: Session,
):
    task = course_task(course_id, task_id, db)
    require_task_editor(task, user, db, "edit")

    task.task_name = payload.task_name
    task.task_description = payload.task_description
    task.task_due_date = payload.task_due_date
    task.tasks = [assignee.model_dump() for assignee in payload.task_assignee]

    db.commit()
    db.refresh(task)

    return task_data(task)


def delete_task(
    course_id: str,
    task_id: int,
    user: User,
    db: Session,
):
    task = course_task(course_id, task_id, db)
    require_task_editor(task, user, db, "delete")

    db.delete(task)
    db.commit()

    return {"task_id": task_id, "deleted": True}
