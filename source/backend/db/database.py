from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

from dotenv import load_dotenv
load_dotenv()

url = os.getenv("DATABASE_URL")
# print(url)
engine = create_engine(url, echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

base = declarative_base()

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()