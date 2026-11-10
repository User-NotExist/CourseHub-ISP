import os

from fastapi import Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from limits import parse, storage, strategies
from starlette.middleware.base import BaseHTTPMiddleware

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"

RATE_LIMIT = parse("60/minute")

_limiter = strategies.FixedWindowRateLimiter(storage.MemoryStorage())


def client_key(request: Request) -> str:
    # 1. Logged-in user: limit per user
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return f"user:{payload['sub']}"
        except (JWTError, KeyError):
            pass

    # 2. Not logged in (students): limit per real IP, sent by the Next.js server
    client_ip = request.headers.get("x-client-ip")
    if client_ip:
        return f"ip:{client_ip}"

    # 3. Fallback: whoever connected directly
    return f"ip:{request.client.host if request.client else 'unknown'}"


# Applies RATE_LIMIT to every route, per person
class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not _limiter.hit(RATE_LIMIT, client_key(request)):
            return JSONResponse({"detail": "Too many requests, please slow down !"}, status_code=429)
        return await call_next(request)
