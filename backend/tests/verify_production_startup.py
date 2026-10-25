"""
Standalone clean-process verification script for production startup.
Runs in an isolated process to test true production environment configuration.
"""

import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Create an isolated temp directory for the test production DB
with tempfile.TemporaryDirectory() as tmp_dir:
    temp_db_path = Path(tmp_dir) / "prod_verification.db"
    
    # Configure production environment variables
    os.environ["APP_ENV"] = "production"
    os.environ["DATABASE_URL"] = f"sqlite:///{temp_db_path.as_posix()}"
    os.environ["SECRET_KEY"] = "production-clean-startup-verification-secret-32chars"
    os.environ["CORS_ORIGINS"] = "https://complaints.aicte-india.org,https://admin.aicte-india.org"
    os.environ["ENABLE_DOCS"] = "false"
    os.environ["SEED_DEMO_DATA_ON_STARTUP"] = "false"
    os.environ["ENFORCE_HTTPS"] = "true"

    # Import backend application in isolated environment
    from fastapi.testclient import TestClient
    from app import config
    from app.main import app
    from app.database import engine, Base, SessionLocal
    from app.models import Institution, ComplaintCase

    print(f"[*] Verifying Production Configuration Flags...")
    assert config.APP_ENV == "production", f"Expected APP_ENV=production, got {config.APP_ENV}"
    assert config.IS_PRODUCTION is True
    assert config.ENABLE_DOCS is False
    assert config.SEED_DEMO_DATA_ON_STARTUP is False
    assert config.ENFORCE_HTTPS is True
    assert "https://complaints.aicte-india.org" in config.CORS_ORIGINS
    print("[OK] Configuration flags properly set.")

    # Trigger database table creation
    Base.metadata.create_all(bind=engine)

    client = TestClient(app)

    # 1. Health endpoint returns UP with production flag
    print("[*] Probing /health endpoint...")
    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    health_data = res.json()
    assert health_data["status"] == "UP"
    assert health_data["app_env"] == "production"
    print(f"[OK] Health probe passed: {health_data}")

    # 2. Security headers are applied
    print("[*] Verifying HTTP security headers...")
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert "strict-transport-security" in res.headers
    print("[OK] Strict security headers verified.")

    # 3. Documentation endpoints are disabled in production
    print("[*] Verifying OpenAPI / Swagger UI endpoints are disabled...")
    res_docs = client.get("/docs")
    assert res_docs.status_code == 404, f"Expected 404 for /docs, got {res_docs.status_code}"
    res_redoc = client.get("/redoc")
    assert res_redoc.status_code == 404, f"Expected 404 for /redoc, got {res_redoc.status_code}"
    print("[OK] /docs and /redoc are disabled (404 Not Found).")

    # 4. Verify no synthetic demo accounts or cases were seeded
    print("[*] Verifying production database contains zero unapproved synthetic seeds...")
    db = SessionLocal()
    institutions_count = db.query(Institution).count()
    complaints_count = db.query(ComplaintCase).count()
    db.close()

    assert institutions_count == 0, f"Expected 0 institutions, found {institutions_count}"
    assert complaints_count == 0, f"Expected 0 complaints, found {complaints_count}"
    print(f"[OK] Verified clean database schema without demo injection: 0 institutions, 0 cases.")
    
    # Release DB connections
    engine.dispose()

    print("\n=======================================================")
    print("PRODUCTION STARTUP CONFIGURATION VERIFIED SUCCESSFULLY!")
    print("=======================================================")
