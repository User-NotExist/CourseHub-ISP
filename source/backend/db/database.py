from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

from dotenv import load_dotenv
load_dotenv()

url = os.getenv("DATABASE_URL")

# engine = create_engine(url, echo=True)
engine = create_engine(
    url,
    echo=True,          # print SQL queries to logs
    pool_pre_ping=True, # check connection before use; reconnect if dead
    pool_recycle=300,   # replace connections older than 5 min
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

base = declarative_base()

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()