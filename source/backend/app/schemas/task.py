from typing import List, Literal, Optional

from pydantic import BaseModel


class TaskAssignee(BaseModel):
    task_assignee_gmail: str
    status: Literal["To-Do", "In-Progress", "Done"]


class TaskCreate(BaseModel):
    task_name: str
    task_description: Optional[str] = None
    task_due_date: Optional[str] = None
    task_assignee: List[TaskAssignee] = []


class TaskStatusUpdate(BaseModel):
    status: Literal["To-Do", "In-Progress", "Done"]
    task_assignee_gmail: Optional[str] = None
