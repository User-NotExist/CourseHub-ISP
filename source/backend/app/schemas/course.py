from typing import Literal, Optional

from pydantic import BaseModel, Field


class CourseCreate(BaseModel):
    course_name: str
    course_description: Optional[str] = None
    course_thumbnail: Optional[str] = None


class MemberEdit(BaseModel):
    email: str
    role: Literal["lecturer", "ta"]


class CourseEdit(BaseModel):
    course_id: str
    course_name: str = Field(min_length=1)
    course_description: str = Field(min_length=1, max_length=70)
    members: Optional[list[MemberEdit]] = None
