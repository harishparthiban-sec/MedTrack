from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class UserDB(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    prescriptions = relationship("PrescriptionDB", back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("ScheduleDB", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("AdherenceLogDB", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("MedicalReportDB", back_populates="user", cascade="all, delete-orphan")


class PrescriptionDB(Base):
    __tablename__ = "prescriptions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    doctor_name = Column(String, nullable=True)
    date = Column(String, nullable=True)
    ambiguous_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserDB", back_populates="prescriptions")
    medicines = relationship("MedicineDB", back_populates="prescription", cascade="all, delete-orphan")


class MedicineDB(Base):
    __tablename__ = "medicines"

    id = Column(String, primary_key=True, index=True)
    prescription_id = Column(String, ForeignKey("prescriptions.id"), nullable=False)
    name = Column(String, nullable=False)
    strength = Column(String, nullable=False)
    dose = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    timing = Column(String, nullable=False)
    duration_days = Column(Integer, default=7)
    confidence = Column(Float, default=1.0)
    needs_review = Column(Boolean, default=False)
    review_reason = Column(String, nullable=True)

    prescription = relationship("PrescriptionDB", back_populates="medicines")


class ScheduleDB(Base):
    __tablename__ = "schedules"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    prescription_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    time = Column(String, nullable=False)
    time_category = Column(String, nullable=False)
    timing_instruction = Column(String, nullable=False)
    duration_days = Column(Integer, default=7)
    remaining_days = Column(Integer, default=7)
    start_date = Column(String, nullable=False)
    active = Column(Boolean, default=True)

    user = relationship("UserDB", back_populates="schedules")


class AdherenceLogDB(Base):
    __tablename__ = "adherence_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    schedule_id = Column(String, nullable=False)
    medicine_name = Column(String, nullable=False)
    status = Column(String, nullable=False) # "taken", "ignored", "missed"
    timestamp = Column(String, nullable=False)
    scheduled_time = Column(String, nullable=False)
    log_date = Column(String, nullable=False)

    user = relationship("UserDB", back_populates="logs")


class MedicalReportDB(Base):
    __tablename__ = "medical_reports"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    lab_name = Column(String, nullable=True)
    report_date = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserDB", back_populates="reports")
    test_results = relationship("TestResultDB", back_populates="report", cascade="all, delete-orphan")


class TestResultDB(Base):
    __tablename__ = "test_results"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, ForeignKey("medical_reports.id"), nullable=False)
    test_name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    reference_range = Column(String, nullable=True)
    category = Column(String, default="General")
    is_abnormal = Column(Boolean, default=False)
    notes = Column(String, nullable=True)

    report = relationship("MedicalReportDB", back_populates="test_results")
