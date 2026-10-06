"""Response mappings for endpoints without Pydantic response models."""
from app.models import CourseMember, Task, User


def task_data(task: Task, *, can_edit: bool | None = None) -> dict:
    data = {
        "task_owner_id": task.user_id,
        "task_id": task.task_id,
        "task_name": task.task_name,
        "task_description": task.task_description,
        "task_due_date": str(task.task_due_date),
        "tasks": task.tasks,
    }
    if can_edit is not None:
        data["can_edit"] = can_edit
    return data


def course_membership_data(membership: CourseMember, user: User) -> dict:
    course = membership.course
    return {
        "course_id": course.course_id,
        "course_unique_for_lecturer": course.course_unique_for_lecturer,
        "course_unique_for_ta": course.course_unique_for_ta,
        "course_unique_for_student": course.course_unique_for_student,
        "course_name": course.course_name,
        "course_description": course.course_description,
        "course_thumbnail": course.course_thumbnail,
        "createdAt": str(course.createdAt),
        "role": membership.role,
        "can_edit": user.is_admin or membership.role == "lecturer",
    }
