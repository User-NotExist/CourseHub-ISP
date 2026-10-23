from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

from db.database import base, engine
import db.models as models
from auth.auth import router as auth_router
from features.course import router as course_router
from features.activity import router as activity_router
from features.task import router as task_router
from features.consultation_log import router as consultation_logs_router
from features.faq import router as faq_router, student_router as faq_student_router

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(course_router)
app.include_router(activity_router)
app.include_router(task_router)
app.include_router(consultation_logs_router)
app.include_router(faq_router)
app.include_router(faq_student_router)