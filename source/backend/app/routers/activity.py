from typing import Optional

from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.core.security import authenticated_user
from app.database import get_db
from app.schemas.activity import ActivityCreate, ActivityEdit, ActivityResponse
from app.services import activity as service

router = APIRouter(prefix="/course/{course_id}/activities", tags=["activity"])


@router.get("", response_model=list[ActivityResponse])
async def list_activities(
    course_id: str,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, missing_user_status=401)
    return service.list_activities(course_id, user, db)


@router.post("", response_model=ActivityResponse, status_code=201)
async def create_activity(
    course_id: str,
    payload: ActivityCreate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, missing_user_status=401)
    return service.create_activity(course_id, payload, user, db)


@router.put("/{activity_id}", response_model=ActivityResponse)
async def edit_activity(
    course_id: str,
    activity_id: int,
    payload: ActivityEdit,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, missing_user_status=401)
    return service.edit_activity(course_id, activity_id, payload, user, db)


@router.delete("/{activity_id}")
async def delete_activity(
    course_id: str,
    activity_id: int,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, missing_user_status=401)
    return service.delete_activity(course_id, activity_id, user, db)
