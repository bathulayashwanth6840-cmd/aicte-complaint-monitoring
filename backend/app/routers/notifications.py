from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, models, schemas

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=Dict[str, Any])
def list_notifications(
    recipient: Optional[str] = Query(None, description="Filter by recipient name or role"),
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve system alerts and notifications with filtering."""
    items, total = crud.get_notifications(
        db, recipient=recipient, unread_only=unread_only, skip=skip, limit=limit
    )
    unread_count = (
        db.query(models.Notification)
        .filter(models.Notification.read_status == False)
        .count()
    )

    return {
        "data": [
            {
                "id": n.id,
                "recipient": n.recipient,
                "related_case_id": n.related_case_id,
                "notification_type": n.notification_type,
                "message": n.message,
                "created_at": n.created_at,
                "read_status": n.read_status,
            }
            for n in items
        ],
        "total": total,
        "unread_count": unread_count,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=schemas.NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    notif_in: schemas.NotificationCreate,
    db: Session = Depends(get_db),
):
    """Create a new system alert notification."""
    notif = models.Notification(
        recipient=notif_in.recipient,
        related_case_id=notif_in.related_case_id,
        notification_type=notif_in.notification_type,
        message=notif_in.message,
        read_status=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
):
    """Mark a specific notification as read."""
    notif = crud.mark_notification_as_read(db, notification_id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found.",
        )
    return notif


@router.post("/mark-all-read")
def mark_all_read(
    recipient: Optional[str] = Query(None, description="Optional recipient filter"),
    db: Session = Depends(get_db),
):
    """Mark all unread notifications as read."""
    count = crud.mark_all_notifications_as_read(db, recipient=recipient)
    return {"message": f"Marked {count} notifications as read."}


# ==========================================
# DEADLINE MONITORING & REMINDER ENDPOINTS
# ==========================================

@router.post("/scan-deadlines")
def trigger_deadline_monitoring_scan(db: Session = Depends(get_db)):
    """
    Trigger automatic deadline monitoring scan across all open cases.
    Dispatches Approaching-Deadline Reminders, Overdue-Case Alerts,
    Pending-Case Reminders, and Escalation Notifications with deduplication.
    """
    from app import deadline_engine
    result = deadline_engine.run_deadline_monitoring_scan(db)
    return {
        "status": "Scan Complete",
        "details": result,
    }


@router.get("/deadlines/config")
def get_deadline_configuration():
    """Retrieve current configurable deadline thresholds."""
    from app import deadline_engine
    return deadline_engine.get_deadline_config()


@router.put("/deadlines/config")
def update_deadline_configuration(updates: Dict[str, int]):
    """Update configurable deadline thresholds (approaching_threshold_days, pending_reminder_days, etc.)."""
    from app import deadline_engine
    new_config = deadline_engine.update_deadline_config(updates)
    return {
        "message": "Deadline configuration updated successfully.",
        "config": new_config,
    }


@router.get("/deadlines/approaching")
def list_approaching_deadline_cases(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List cases currently approaching their disposal deadline."""
    from app import deadline_engine
    cases = deadline_engine.get_approaching_deadline_cases(db, limit=limit)
    return {"data": cases, "total": len(cases)}


@router.get("/deadlines/overdue")
def list_overdue_cases(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List cases currently overdue beyond their expected disposal deadline."""
    from app import deadline_engine
    cases = deadline_engine.get_overdue_cases(db, limit=limit)
    return {"data": cases, "total": len(cases)}

