
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from jose import jwt

from database import get_db
from models import User

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 1 day

ALLOWED_DOMAIN = "ku.th"

# Oauth setup
oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

@router.get("/login")
async def login(request: Request):
    # redict user to Oauth scene
    redirect_uri = GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(status_code=400, detail="OAuth authorization failed") # ---------

    userinfo = token.get("userinfo")
    if not userinfo:
        raise HTTPException(status_code=400, detail="Could not fetch user info from Google")

    email = userinfo.get("email")
    name = userinfo.get("name")
    email_verified = userinfo.get("email_verified", False)

    if not email or not email_verified:
        raise HTTPException(status_code=400, detail="Email not verified by Google")

    domain = email.split("@")[-1].lower()
    if domain != ALLOWED_DOMAIN:
        raise HTTPException(status_code=403, detail=f"Only @{ALLOWED_DOMAIN} accounts are allowed to log in",)

    user = db.query(User).filter(User.user_email == email).first()
    if not user:
        user = User(user_email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": str(user.user_id), "email": user.user_email})

    response = RedirectResponse(url=f"{FRONTEND_URL}/auth/success?token={access_token}")
    return response

router.post("/logout")
async def auth_logout(request: Request):
    request.session.clear()

    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie(
        key="access_token",
        path="/",
    )
    return response