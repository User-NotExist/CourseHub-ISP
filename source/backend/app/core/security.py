"""Shared JWT handling with each route's existing authentication errors."""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User


def create_access_token(data: dict) -> str:
    claims = data.copy()
    claims["exp"] = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def authenticated_user(
    access_token: str | None,
    db: Session,
    *,
    error_suffix: str = "",
    missing_user_status: int = 404,
) -> User:
    if not access_token:
        raise HTTPException(status_code=401, detail=f"Not authenticated{error_suffix}")
    try:
        claims = jwt.decode(access_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(claims["sub"])
    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail=f"Invalid or expired token{error_suffix}") from None

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=missing_user_status, detail=f"User not found{error_suffix}")
    return user
