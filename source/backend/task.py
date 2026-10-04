import os
from datetime import datetime, timedelta

from fastapi import Query

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


@router.post("/create")
async def create_task(
    course_id: str,
    payload: TaskCreate,
    # access_token: str = Cookie(None),
    access_token: Optional[str] = Query(None),
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


@router.get("/read")
async def display_me_tasks(
        # access_token: str = Cookie(None),
        access_token: Optional[str] = Query(None),
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

    user_tasks = (
            db.query(Task)
            .filter(
                or_(
                    Task.user_id == user.user_id,
                    cast(Task.tasks, JSONB).contains([{"task_assignee_gmail": user.user_email}])
                )
            )
            .all()
        )

    taskss = []
    for t in user_tasks:
        taskss.append({
            "task_owner_id": t.user_id,
            "task_id": t.task_id,
            "task_name": t.task_name,
            "task_description": t.task_description,
            "task_due_date": str(t.task_due_date),
            "tasks": t.tasks,
        })

    return taskss


@router.get("/read/{task_id}")
async def display_task(
    course_id: str,
    task_id: int,
    # access_token: str = Cookie(None),
    access_token: Optional[str] = Query(None),
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


@router.put("/edit/{task_id}")
async def edit_task(
    course_id: str,
    task_id: int,
    payload: TaskCreate,
    # access_token: str = Cookie(None),
    access_token: Optional[str] = Query(None),
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

    if task.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="You are not the owner of this task !")

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
    # access_token: str = Cookie(None),
    access_token: Optional[str] = Query(None),
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

    if task.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="You are not the owner of this task !")

    db.delete(task)
    db.commit()

    return {"task_id": task_id, "deleted": True}