from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field

# --- Pydantic Schemas ---

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractedMedicine(BaseModel):
    name: str
    strength: str
    dose: str
    frequency: str  # e.g., "Twice daily", "Once daily", "Every 8 hours"
    timing: str     # e.g., "Before food", "After food", "With food"
    duration_days: int
    confidence: float
    needs_review: bool = False
    review_reason: Optional[str] = None


class ExtractedTestResult(BaseModel):
    test_name: str
    value: float
    unit: str
    reference_range: Optional[str] = None
    category: str = "General"  # e.g., "Diabetes", "Vitamins", "Lipid Profile", "Thyroid"
    is_abnormal: bool = False
    notes: Optional[str] = None


class ParsePrescriptionResponse(BaseModel):
    document_name: str
    doctor_name: Optional[str] = None
    date: Optional[str] = None
    medicines: List[ExtractedMedicine]
    ambiguous_count: int
    notes: str


class ParseReportResponse(BaseModel):
    document_name: str
    lab_name: Optional[str] = None
    report_date: str
    test_results: List[ExtractedTestResult]
    summary: str


class MedicineScheduleSlot(BaseModel):
    id: str
    medicine_name: str
    dosage: str
    time: str       # e.g. "08:00 AM"
    timing_instruction: str  # e.g. "After food"
    duration_days: int
    remaining_days: int
    prescription_id: str


class AdherenceLogCreate(BaseModel):
    schedule_id: str
    medicine_name: str
    status: str     # "taken", "ignored", "missed"
    timestamp: str  # ISO string
    scheduled_time: str


class HealthComparisonItem(BaseModel):
    test_name: str
    unit: str
    previous_value: float
    current_value: float
    change_percentage: float
    status: str     # "improved", "worsened", "stable", "needs_review"
    explanation: str
    reference_range: Optional[str] = None


class HealthComparisonReport(BaseModel):
    report_id_prev: str
    report_id_curr: str
    date_prev: str
    date_curr: str
    overall_summary: str
    items: List[HealthComparisonItem]
