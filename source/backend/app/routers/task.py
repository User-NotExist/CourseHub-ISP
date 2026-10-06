from typing import Optional

from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.core.security import authenticated_user
from app.database import get_db
from app.schemas.task import TaskCreate, TaskStatusUpdate
from app.services import task as service

router = APIRouter(prefix="/course/{course_id}/tasks", tags=["task"])


@router.post("/create")
async def create_task(
    course_id: str,
    payload: TaskCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.create_task(course_id, payload, user, db)


@router.get("/read")
async def display_me_tasks(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.display_me_tasks(course_id, user, db)


@router.get("/read/{task_id}")
async def display_task(
    course_id: str,
    task_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.display_task(course_id, task_id, user, db)


@router.patch("/{task_id}")
async def update_task_status(
    course_id: str,
    task_id: int,
    payload: TaskStatusUpdate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.update_task_status(course_id, task_id, payload, user, db)


@router.put("/edit/{task_id}")
async def edit_task(
    course_id: str,
    task_id: int,
    payload: TaskCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.edit_task(course_id, task_id, payload, user, db)


@router.delete("/delete/{task_id}")
async def delete_task(
    course_id: str,
    task_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.delete_task(course_id, task_id, user, db)
