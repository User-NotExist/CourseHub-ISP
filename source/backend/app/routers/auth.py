from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.oauth import oauth
from app.core.security import authenticated_user, create_access_token
from app.database import get_db
from app.services.auth import google_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(status_code=400, detail="OAuth authorization failed") from None

    user = google_user(token.get("userinfo"), db)
    access_token = create_access_token({"sub": str(user.user_id), "email": user.user_email})
    response = RedirectResponse(url=f"{settings.frontend_url}/courses")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )
    return response


@router.get("/me")
async def get_me(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    user = authenticated_user(access_token, db)
    return {"user_id": user.user_id, "email": user.user_email}


@router.post("/logout")
async def auth_logout(request: Request):
    request.session.clear()
    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie(key="access_token", path="/")
    return response
