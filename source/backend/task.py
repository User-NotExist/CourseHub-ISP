import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from typing import Optional, Literal, List

from sqlalchemy import or_, cast, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

import string, secrets

from database import get_db
from models import User, Course, CourseMember, Task, Activity, Faq, Comments

router = APIRouter(prefix="/course/{course_id}/tasks", tags=["task"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


class TaskAssignee(BaseModel):
    task_assignee_gmail: str
    status: Literal["To-Do", "In-Progress", "Done"]


class TaskCreate(BaseModel):
    task_name: str
    task_description: Optional[str] = None
    task_due_date: Optional[str] = None
    task_assignee: List[TaskAssignee] = []


class TaskStatusUpdate(BaseModel):
    status: Literal["To-Do", "In-Progress", "Done"]
    task_assignee_gmail: Optional[str] = None


@router.post("/create")
async def create_task(
    course_id: str,
    payload: TaskCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    is_member = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
    ).first()
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

    return {
        "task_owner_id": new_task.user_id,
        "task_id": new_task.task_id,
        "task_name": new_task.task_name,
        "task_description": new_task.task_description,
        "task_due_date": str(new_task.task_due_date),
        "tasks": new_task.tasks,
    }

# Display all course's tasks
@router.get("/read")
async def display_me_tasks(
        course_id: str,
        access_token: Optional[str] = Cookie(None),
        db: Session = Depends(get_db)
    ):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    is_member = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this course !")

    all_task = (
        db.query(Task)
        .filter(Task.course_id == course_id)
        .all()
    )

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    taskss = []
    for t in all_task:
        taskss.append({
            "task_owner_id": t.user_id,
            "task_id": t.task_id,
            "task_name": t.task_name,
            "task_description": t.task_description,
            "task_due_date": str(t.task_due_date),
            "tasks": t.tasks,
            "can_edit": t.user_id == user.user_id or is_lecturer,
        })

    return taskss

# For task edit
@router.get("/read/{task_id}")
async def display_task(
    course_id: str,
    task_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    task = db.query(Task).filter(Task.task_id == task_id, Task.course_id == course_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found !")

    return {
        "task_owner_id": task.user_id,
        "task_id": task.task_id,
        "task_name": task.task_name,
        "task_description": task.task_description,
        "task_due_date": str(task.task_due_date),
        "tasks": task.tasks,
    }


# Owner, assignee, or lecturer can update status
@router.patch("/{task_id}") #The router already includes /course/{course_id}/tasks, so using {task_id} to distinct from existing task endpoints
async def update_task_status(
    course_id: str,
    task_id: int,
    payload: TaskStatusUpdate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(token_payload["sub"])
    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    task = db.query(Task).filter(Task.task_id == task_id, Task.course_id == course_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None
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


@router.put("/edit/{task_id}")
async def edit_task(
    course_id: str,
    task_id: int,
    payload: TaskCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    task = db.query(Task).filter(Task.task_id == task_id, Task.course_id == course_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    if task.user_id != user.user_id and not is_lecturer:
        raise HTTPException(status_code=403, detail="Only the task owner or lecturer can edit this task !")

    task.task_name = payload.task_name
    task.task_description = payload.task_description
    task.task_due_date = payload.task_due_date
    task.tasks = [assignee.model_dump() for assignee in payload.task_assignee]

    db.commit()
    db.refresh(task)

    return {
        "task_owner_id": task.user_id,
        "task_id": task.task_id,
        "task_name": task.task_name,
        "task_description": task.task_description,
        "task_due_date": str(task.task_due_date),
        "tasks": task.tasks,
    }


@router.delete("/delete/{task_id}")
async def delete_task(
    course_id: str,
    task_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated !")

    try:
        token_payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token !")

    user = db.query(User).filter(User.user_id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found !")

    task = db.query(Task).filter(Task.task_id == task_id, Task.course_id == course_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found !")

    is_lecturer = db.query(CourseMember).filter(
        CourseMember.course_id == course_id,
        CourseMember.user_id == user.user_id,
        CourseMember.role == "lecturer",
    ).first() is not None

    if task.user_id != user.user_id and not is_lecturer:
        raise HTTPException(status_code=403, detail="Only the task owner or lecturer can delete this task !")

    db.delete(task)
    db.commit()

    return {"task_id": task_id, "deleted": True}
