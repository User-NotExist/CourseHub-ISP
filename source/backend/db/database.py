from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

from dotenv import load_dotenv
load_dotenv()

url = os.getenv("DATABASE_URL")

# engine = create_engine(url, echo=True)
engine = create_engine(url, echo=True, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

base = declarative_base()

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()