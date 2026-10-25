from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    """Health check endpoint validating database connectivity and backend readiness."""
    try:
        # Verify database connection
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    from app import config
    return {
        "status": "UP" if db_status == "healthy" else "DEGRADED",
        "service": "AICTE Integrated Institution Complaint Monitoring System",
        "app_env": config.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "version": "1.0.0",
    }
