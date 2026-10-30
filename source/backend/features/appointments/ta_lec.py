import os
from datetime import date, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Cookie
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, CourseMember, Appointments

router = APIRouter(prefix="/course/{course_id}/appointments", tags=["appointments"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"