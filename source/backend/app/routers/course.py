from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.core.security import authenticated_user
from app.database import get_db
from app.schemas.course import CourseCreate, CourseEdit
from app.services import course as service

router = APIRouter(prefix="/course", tags=["course"])


@router.get("/display-course")
async def display_me_courses(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.display_me_courses(user, db)


@router.post("/create")
async def create_course(
    payload: CourseCreate,
    access_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.create_course(payload, user, db)


@router.get("/edit/{course_id}")
async def read_course_for_edit(course_id: str, access_token: str = Cookie(None), db: Session = Depends(get_db)):
    user = authenticated_user(access_token, db, missing_user_status=401)
    return service.read_course_for_edit(course_id, user, db)


@router.put("/edit")
async def edit_course(payload: CourseEdit, access_token: str = Cookie(None), db: Session = Depends(get_db)):
    user = authenticated_user(access_token, db, missing_user_status=401)
    return service.edit_course(payload, user, db)


@router.delete("/delete/{course_id}")
async def delete_course(
    course_id: str,
    access_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    user = authenticated_user(access_token, db, error_suffix=" !")
    return service.delete_course(course_id, user, db)
