"""Safely patch the user's existing src/api.py for PulmoScope authentication.
Run from the project root: python apply_auth_patch.py
Creates src/api.py.backup before editing.
"""
from pathlib import Path
import re
import shutil
import sys

path = Path("src/api.py")
if not path.is_file():
    print("ERROR: Run this script from the project root containing src/api.py")
    sys.exit(1)
text = path.read_text(encoding="utf-8")
original = text

# Import Depends without duplicating it.
match = re.search(r"from fastapi import ([^\n]+)", text)
if not match:
    print("ERROR: Could not locate 'from fastapi import ...' in src/api.py")
    sys.exit(1)
imports = match.group(1)
if "Depends" not in [part.strip() for part in imports.split(",")]:
    text = text[:match.start(1)] + imports.rstrip() + ", Depends" + text[match.end(1):]

# Enable credentialed requests for HttpOnly cookie sessions.
text, cors_count = re.subn(r"allow_credentials\s*=\s*False", "allow_credentials=True", text, count=1)
if cors_count != 1:
    print("WARNING: Did not find allow_credentials=False; check CORS configuration manually.")

# Mount the authentication router after the FastAPI app is created.
if "include_router(auth_router)" not in text:
    app_match = re.search(r"app\s*=\s*FastAPI\([\s\S]*?\n\)", text)
    if not app_match:
        print("ERROR: Could not locate app = FastAPI(...) block. No changes written.")
        sys.exit(1)
    mount = "\n\n# Cookie-based MySQL authentication routes\nfrom src.auth_router import router as auth_router, current_user\napp.include_router(auth_router)\n"
    text = text[:app_match.end()] + mount + text[app_match.end():]
else:
    # Ensure current_user is imported if router already mounted.
    text = text.replace("from src.auth_router import router as auth_router\n", "from src.auth_router import router as auth_router, current_user\n")

# Require an authenticated session to call /predict.
predict_pattern = r"async def predict\(file: UploadFile = File\(\.\.\.\)\):"
if re.search(predict_pattern, text):
    text = re.sub(
        predict_pattern,
        "async def predict(file: UploadFile = File(...), user: dict = Depends(current_user)):",
        text,
        count=1,
    )
elif "async def predict(file: UploadFile = File(...), user: dict = Depends(current_user))" not in text:
    print("ERROR: Could not locate the expected predict() signature. No changes written.")
    sys.exit(1)

if text == original:
    print("No changes were needed (the patch may already be applied).")
    sys.exit(0)

backup = path.with_suffix(path.suffix + ".backup")
if not backup.exists():
    shutil.copy2(path, backup)
path.write_text(text, encoding="utf-8")
print(f"Updated {path}; original saved as {backup}")
print("The /predict endpoint now requires a valid login session.")
print("/ and /health remain public; auth endpoints are mounted under /auth.")
