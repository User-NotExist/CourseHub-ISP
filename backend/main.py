from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

from database import base, engine
import models
from auth import router as auth_router

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