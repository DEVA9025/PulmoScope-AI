"""Patients API router for PulmoScope (FastAPI + Mongita/MongoDB)."""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

router = APIRouter(prefix="/patients", tags=["patients"])

mongo_client = None
patients_collection = None


def _get_patients_collection():
    global mongo_client, patients_collection
    if patients_collection is None:
        from mongita import MongitaClientDisk

        db_path = str(PROJECT_ROOT / "local_db")
        mongo_client = MongitaClientDisk(db_path)
        database_name = os.getenv("MONGODB_DATABASE", "pulmoscope")
        patients_collection = mongo_client[database_name]["patients"]

        # Seed initial records if empty
        if patients_collection.count_documents({}) == 0:
            seed_patients = [
                {
                    "mrn": "MRN-4471",
                    "name": "K. Osei",
                    "age": 54,
                    "gender": "F",
                    "phone": "+1 415 220 8841",
                    "symptoms": "Productive cough, fever 39.1°C, dyspnoea",
                    "lastStudy": "2026-09-10",
                    "createdAt": "2026-09-10T09:30:00Z",
                },
                {
                    "mrn": "MRN-4468",
                    "name": "R. Delgado",
                    "age": 37,
                    "gender": "M",
                    "phone": "+1 415 771 3320",
                    "symptoms": "Routine pre-operative screening",
                    "lastStudy": "2026-09-10",
                    "createdAt": "2026-09-10T10:15:00Z",
                },
                {
                    "mrn": "MRN-4452",
                    "name": "M. Haddad",
                    "age": 61,
                    "gender": "M",
                    "phone": "+1 415 908 1177",
                    "symptoms": "Night sweats, weight loss, chronic cough",
                    "lastStudy": "2026-09-09",
                    "createdAt": "2026-09-09T14:20:00Z",
                },
                {
                    "mrn": "MRN-4439",
                    "name": "S. Nakamura",
                    "age": 45,
                    "gender": "F",
                    "phone": "+1 415 664 5502",
                    "symptoms": "Anosmia, low-grade fever, fatigue",
                    "lastStudy": "2026-09-09",
                    "createdAt": "2026-09-09T16:00:00Z",
                },
                {
                    "mrn": "MRN-4402",
                    "name": "L. Fontaine",
                    "age": 68,
                    "gender": "F",
                    "phone": "+1 415 302 9911",
                    "symptoms": "Progressive exertional breathlessness",
                    "lastStudy": "2026-09-08",
                    "createdAt": "2026-09-08T11:45:00Z",
                },
            ]
            for p in seed_patients:
                patients_collection.insert_one(p)

    return patients_collection


def _format_patient(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "mrn": doc.get("mrn", "MRN-UNASSIGNED"),
        "name": doc.get("name", "Unknown Patient"),
        "age": doc.get("age", 0),
        "gender": doc.get("gender", "F"),
        "phone": doc.get("phone", ""),
        "symptoms": doc.get("symptoms", ""),
        "lastStudy": doc.get("lastStudy", "—"),
        "createdAt": doc.get("createdAt", datetime.utcnow().isoformat() + "Z"),
    }


class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    age: int = Field(ge=0, le=130)
    gender: str = Field(default="F")
    phone: str = Field(default="", max_length=40)
    symptoms: str = Field(default="", max_length=500)


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    symptoms: Optional[str] = None
    lastStudy: Optional[str] = None


@router.get("", response_model=list[dict[str, Any]])
def list_patients(search: Optional[str] = None):
    coll = _get_patients_collection()
    docs = list(coll.find({}))
    formatted = [_format_patient(d) for d in docs]

    if search:
        q = search.lower().strip()
        formatted = [
            p
            for p in formatted
            if q in p["name"].lower()
            or q in p["mrn"].lower()
            or q in p["symptoms"].lower()
        ]

    # Return reverse chronological order (newest first)
    return list(reversed(formatted))


@router.post("", status_code=status.HTTP_201_CREATED)
def create_patient(body: PatientCreate):
    coll = _get_patients_collection()

    # Generate next MRN
    total_count = coll.count_documents({})
    mrn = f"MRN-{4472 + total_count}"

    doc = {
        "mrn": mrn,
        "name": body.name.strip(),
        "age": body.age,
        "gender": "M" if body.gender.upper() == "M" else "F",
        "phone": body.phone.strip(),
        "symptoms": body.symptoms.strip(),
        "lastStudy": "—",
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format_patient(doc)


@router.get("/{patient_id}")
def get_patient(patient_id: str):
    coll = _get_patients_collection()
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    doc = coll.find_one({"_id": ObjectId(patient_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    return _format_patient(doc)


@router.put("/{patient_id}")
def update_patient(patient_id: str, body: PatientUpdate):
    coll = _get_patients_collection()
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    update_fields = {}
    if body.name is not None:
        update_fields["name"] = body.name.strip()
    if body.age is not None:
        update_fields["age"] = body.age
    if body.gender is not None:
        update_fields["gender"] = "M" if body.gender.upper() == "M" else "F"
    if body.phone is not None:
        update_fields["phone"] = body.phone.strip()
    if body.symptoms is not None:
        update_fields["symptoms"] = body.symptoms.strip()
    if body.lastStudy is not None:
        update_fields["lastStudy"] = body.lastStudy

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    coll.update_one({"_id": ObjectId(patient_id)}, {"$set": update_fields})
    doc = coll.find_one({"_id": ObjectId(patient_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    return _format_patient(doc)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: str):
    coll = _get_patients_collection()
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    result = coll.delete_one({"_id": ObjectId(patient_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    return None
