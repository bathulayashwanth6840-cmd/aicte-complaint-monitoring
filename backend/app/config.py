import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

APP_NAME = os.getenv("APP_NAME", "AICTE Integrated Institution Complaint Monitoring System API")
APP_ENV = os.getenv("APP_ENV", "development").lower()
IS_PRODUCTION = APP_ENV == "production"

HOST = os.getenv("HOST", "127.0.0.1" if not IS_PRODUCTION else "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# SQLite database path defaults to a local file in backend/
DEFAULT_DB_PATH = BASE_DIR / "aicte_complaints.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# Production Security Flags
ENFORCE_HTTPS = os.getenv("ENFORCE_HTTPS", "false").lower() == "true"
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "true" if not IS_PRODUCTION else "false").lower() == "true"
SEED_DEMO_DATA_ON_STARTUP = os.getenv("SEED_DEMO_DATA_ON_STARTUP", "true" if not IS_PRODUCTION else "false").lower() == "true"

# CORS Origins Configuration
default_dev_origins = "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://localhost:3000,http://127.0.0.1:3000"
cors_raw = os.getenv("CORS_ORIGINS", default_dev_origins if not IS_PRODUCTION else "")
CORS_ORIGINS = [origin.strip() for origin in cors_raw.split(",") if origin.strip()]

# Secret key for token generation and session signatures
SECRET_KEY = os.getenv("SECRET_KEY", "aicte-hackathon-secure-prototype-key-2026")
