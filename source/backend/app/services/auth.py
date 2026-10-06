"""Validate Google identities and find or register users."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User


def google_user(userinfo: dict | None, db: Session) -> User:
    if not userinfo:
        raise HTTPException(status_code=400, detail="Could not fetch user info from Google")

    email = userinfo.get("email")
    if not email or not userinfo.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Email not verified by Google")
    if email.split("@")[-1].lower() != settings.allowed_domain:
        raise HTTPException(
            status_code=403,
            detail=f"Only @{settings.allowed_domain} accounts are allowed to log in",
        )

    user = db.query(User).filter(User.user_email == email).first()
    if not user:
        user = User(user_email=email, name=userinfo.get("name"))
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
