
import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

uri = os.getenv("MONGODB_URI")

if not uri:
    raise RuntimeError("MONGODB_URI is missing from .env")

client = MongoClient(
    uri,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=15000,
)

try:
    client.admin.command("ping")
    print("MongoDB Atlas connection successful!")

    db = client["pulmoscope"]
    print("Database selected:", db.name)
    print("Users collection:", db["users"].name)

except Exception as exc:
    print("MongoDB connection failed.")
    print("Error type:", type(exc).__name__)
    print("Error:", str(exc))

finally:
    client.close()
