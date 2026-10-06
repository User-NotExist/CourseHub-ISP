from datetime import date, datetime, time
from typing import Literal, Optional

from pydantic import AliasPath, BaseModel, ConfigDict, Field, field_validator

ActivityType = Literal["Activities", "Milestones"]


class ActivityCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity_name: str = Field(min_length=1)
    activity_type: ActivityType
    activity_description: Optional[str] = None
    activity_date: Optional[date] = None
    activity_time: Optional[time] = None

    @field_validator("activity_name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Activity name is required")
        return value


class ActivityEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity_name: Optional[str] = Field(default=None, min_length=1)
    activity_type: Optional[ActivityType] = None
    activity_description: Optional[str] = None
    activity_date: Optional[date] = None
    activity_time: Optional[time] = None

    @field_validator("activity_name", "activity_type")
    @classmethod
    def validate_required_fields(cls, value):
        if value is None or not value.strip():
            raise ValueError("Activity name and type cannot be null or blank")
        return value.strip()


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: int
    user_id: int
    course_id: str
    activity_name: str
    activity_type: ActivityType
    activity_description: Optional[str]
    activity_date: Optional[date]
    activity_time: Optional[time]
    createdAt: datetime
    creator_name: str = Field(validation_alias=AliasPath("user", "name"))
