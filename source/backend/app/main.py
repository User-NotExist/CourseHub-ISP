"""Application assembly; schema creation remains part of startup imports."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app import models  # Register every ORM model before creating tables.
from app.core.config import settings
from app.database import base, engine
from app.routers import activity, auth, course, task

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base.metadata.create_all(bind=engine)

for router in (auth.router, course.router, activity.router, task.router):
    app.include_router(router)
