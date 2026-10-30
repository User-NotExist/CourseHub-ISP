from sqlalchemy import (
    Column, Integer, String, Text, Date, Time, Boolean,
    TIMESTAMP, ForeignKey, JSON, func
)
from sqlalchemy.orm import relationship
from db.database import base


class User(base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    course_memberships = relationship("CourseMember", back_populates="user")
    tasks = relationship("Task", back_populates="user")
    activities = relationship("Activity", back_populates="user")
    faqs = relationship("Faq", back_populates="user")
    comments = relationship("Comments", back_populates="user")
    consultation_logs = relationship("ConsultationLogs", back_populates="user")
    appointments_avaliable = relationship("AppointmentsAvaliable", back_populates="user")


class Course(base):
    __tablename__ = "courses"

    course_id = Column(String(12), primary_key=True)
    course_unique_for_lecturer = Column(String(10), unique=True, nullable=False)
    course_unique_for_ta = Column(String(10), unique=True, nullable=False)
    course_unique_for_student = Column(String(10), unique=True, nullable=False)
    course_name = Column(String, nullable=False)
    course_description = Column(Text)
    course_thumbnail = Column(Text)
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    members = relationship("CourseMember", back_populates="course")
    tasks = relationship("Task", back_populates="course")
    activities = relationship("Activity", back_populates="course")
    faqs = relationship("Faq", back_populates="course")
    consultation_logs = relationship("ConsultationLogs", back_populates="course")
    appointments = relationship("Appointments", back_populates="course")
    appointments_avaliable = relationship("AppointmentsAvaliable", back_populates="course")


class CourseMember(base):
    __tablename__ = "course_members"

    member_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)
    role = Column(String, nullable=False)  # "lecturer, ta, student"

    user = relationship("User", back_populates="course_memberships")
    course = relationship("Course", back_populates="members")


class Task(base):
    __tablename__ = "tasks"

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)

    task_name = Column(String, nullable=False)
    task_description = Column(Text)
    task_due_date = Column(Date)
    tasks = Column(JSON)
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="tasks")
    course = relationship("Course", back_populates="tasks")


class Activity(base):
    __tablename__ = "activities"

    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)

    activity_name = Column(String, nullable=False)
    activity_type = Column(String, nullable=False) # Activities, Milestones
    activity_description = Column(Text)
    activity_date = Column(Date)
    activity_time = Column(Time)
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="activities")
    course = relationship("Course", back_populates="activities")


class Faq(base):
    __tablename__ = "faqs"

    faq_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)

    faq_name = Column(String, nullable=False)
    faq_description = Column(Text)
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="faqs")
    course = relationship("Course", back_populates="faqs")


class Comments(base):
    __tablename__ = "comments"

    comment_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=True)

    comment = Column(Text, nullable=False)
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="comments")


class ConsultationLogs(base):
    __tablename__ = "consultation_logs"

    consultation_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text)
    consultation_with_name = Column(String)
    consultation_with_id = Column(String)
    consultation_date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    consultant = Column(String)    # consultant gmail
    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="consultation_logs")
    course = relationship("Course", back_populates="consultation_logs")


class AppointmentsAvaliable(base):
    __tablename__ = "appointments_avaliable"

    avaliable_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)    # lecturer only

    avaliable_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    notes = Column(String)
    max_bookings = Column(Integer, nullable=False, default=5)

    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="appointments_avaliable")
    course = relationship("Course", back_populates="appointments_avaliable")
    appointments = relationship("Appointments", back_populates="slot")


class Appointments(base):
    __tablename__ = "appointments"

    appointment_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(String(12), ForeignKey("courses.course_id"), nullable=False)
    avaliable_id = Column(Integer, ForeignKey("appointments_avaliable.avaliable_id"), nullable=False)    # booked slot

    student_first_name = Column(String, nullable=False)
    student_last_name = Column(String, nullable=False)
    student_email = Column(String, nullable=False)
    appointments_description = Column(Text)

    createdAt = Column(TIMESTAMP(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="appointments")
    slot = relationship("AppointmentsAvaliable", back_populates="appointments")