
"""Cookie-based authentication router for PulmoScope AI (FastAPI + MongoDB Atlas)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from bson import ObjectId

# Load the project's root .env file.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

router = APIRouter(prefix="/auth", tags=["authentication"])
password_hash = PasswordHash.recommended()

SESSION_COOKIE = "pulmoscope_session"
SESSION_MAX_AGE = 60 * 60 * 8


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        _required_env("SESSION_SECRET_KEY"),
        salt="pulmoscope-auth-v1",
    )


def _get_database():
    # Cache one database client for this running application.
    # Uses mongita (local file-based MongoDB-compatible store) to avoid
    # MongoDB Atlas connectivity issues on IPv6-only networks.
    global mongo_client, users_collection
    if mongo_client is None:
        from mongita import MongitaClientDisk

        db_path = str(PROJECT_ROOT / "local_db")
        mongo_client = MongitaClientDisk(db_path)
        database_name = os.getenv("MONGODB_DATABASE", "pulmoscope")
        users_collection = mongo_client[database_name]["users"]
        users_collection.create_index("email")
    return users_collection


mongo_client = None
users_collection = None


def _public_user(user: dict[str, Any]) -> dict[str, str]:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user["full_name"],
    }


def _set_session(response: Response, user_id: str) -> None:
    token = _serializer().dumps({"uid": user_id})
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        samesite=os.getenv("COOKIE_SAMESITE", "lax").lower(),
        path="/",
    )


def current_user(request: Request) -> dict[str, Any]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Please sign in.",
        )

    try:
        data = _serializer().loads(token, max_age=SESSION_MAX_AGE)
        user_id = str(data["uid"])
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user ID")
    except (BadSignature, SignatureExpired, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Your session is invalid or expired.",
        )

    try:
        user = _get_database().find_one(
            {"_id": ObjectId(user_id)},
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Could not check your account. Check the database connection.",
        )

    if not user:
        raise HTTPException(status_code=401, detail="User account was not found.")

    return _public_user(user)


class RegisterBody(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Enter your full name.")
        return value


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


@router.post("/register", status_code=201)
def register(body: RegisterBody, response: Response):
    email = str(body.email).strip().lower()

    try:
        users = _get_database()

        # Manual duplicate check (mongita doesn't support unique indexes).
        if users.find_one({"email": email}):
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        user = {
            "full_name": body.full_name,
            "email": email,
            "password_hash": password_hash.hash(body.password),
        }
        result = users.insert_one(user)
        user_id = str(result.inserted_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Could not save the account. Check the database connection.",
        )

    _set_session(response, user_id)
    return {
        "user": {
            "id": user_id,
            "email": email,
            "full_name": body.full_name,
        }
    }


@router.post("/login")
def login(body: LoginBody, response: Response):
    email = str(body.email).strip().lower()

    try:
        user = _get_database().find_one({"email": email})
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Could not check credentials. Check the database connection.",
        )

    if not user or not password_hash.verify(
        body.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    _set_session(response, str(user["_id"]))
    return {"user": _public_user(user)}


@router.get("/me")
def me(user: dict[str, Any] = Depends(current_user)):
    return {"user": user}


@router.post("/logout")
def logout():
    response = JSONResponse({"message": "Signed out successfully."})
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        samesite=os.getenv("COOKIE_SAMESITE", "lax").lower(),
    )
    return response
