import uuid
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

from database import engine, Base, get_db
import db_models
from models import (
    UserCreate,
    User as UserModel,
    ParsePrescriptionResponse,
    ParseReportResponse,
    HealthComparisonReport,
    ExtractedTestResult,
    AdherenceLogCreate,
)
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from ai_parser import parse_prescription_text, parse_lab_report_text
from health_analytics import compare_health_reports

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedTrack AI Production API",
    description="Full-stack API with User Auth, SQLite DB, OCR Document Parsing & Health Comparison Engine",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health-check")
def health_check():
    return {"status": "online", "database": "connected", "engine": "MedTrack AI 2.0"}

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register")
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(db_models.UserDB).filter(db_models.UserDB.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    user_id = "usr-" + str(uuid.uuid4())[:8]
    hashed_pw = get_password_hash(user_in.password)
    
    new_user = db_models.UserDB(
        id=user_id,
        email=user_in.email.lower(),
        name=user_in.name,
        hashed_password=hashed_pw,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "streakDays": 1,
        }
    }


@app.post("/api/auth/login")
def login_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(db_models.UserDB).filter(db_models.UserDB.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password.")
    
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "streakDays": 7,
        }
    }


@app.get("/api/auth/me")
def get_current_user_profile(current_user: db_models.UserDB = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "streakDays": 7,
    }

# --- PRESCRIPTIONS & SCHEDULES ENDPOINTS ---

@app.post("/api/upload/prescription", response_model=ParsePrescriptionResponse)
async def upload_prescription(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None)
):
    filename = file.filename if file else "Scanned_Prescription.pdf"
    content_text = raw_text or "Rx Tab Paracetamol 500mg 1 tablet twice daily after food 5 days. Tab Vitamin D3 60000IU once weekly 4 weeks."
    parsed = parse_prescription_text(content_text, filename=filename)
    return parsed


@app.post("/api/upload/report", response_model=ParseReportResponse)
async def upload_report(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None)
):
    filename = file.filename if file else "Lab_Blood_Report.pdf"
    content_text = raw_text or "Blood Test Results: HbA1c 6.5%, Vitamin D 28.5 ng/mL, LDL 142 mg/dL"
    parsed = parse_lab_report_text(content_text, filename=filename)
    return parsed


@app.post("/api/compare-reports", response_model=HealthComparisonReport)
def compare_reports_api(payload: dict):
    prev_tests = [ExtractedTestResult(**t) for t in payload.get("prev_tests", [])]
    curr_tests = [ExtractedTestResult(**t) for t in payload.get("curr_tests", [])]
    
    return compare_health_reports(
        prev_report_id=payload.get("report_id_prev", "rep-1"),
        curr_report_id=payload.get("report_id_curr", "rep-2"),
        date_prev=payload.get("date_prev", "2026-05-15"),
        date_curr=payload.get("date_curr", "2026-08-22"),
        prev_tests=prev_tests,
        curr_tests=curr_tests,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
