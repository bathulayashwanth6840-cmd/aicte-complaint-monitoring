from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/actions", tags=["Audit Trail & Action History"])


@router.get("", response_model=Dict[str, Any])
def list_actions(
    case_id: Optional[str] = Query(None, description="Filter actions by Case ID"),
    acting_user: Optional[str] = Query(None, description="Filter by acting officer/user"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve global system audit history with filtering and pagination."""
    query = db.query(models.CaseAction)

    if case_id:
        query = query.filter(models.CaseAction.case_id == case_id)
    if acting_user:
        query = query.filter(models.CaseAction.acting_user.ilike(f"%{acting_user}%"))
    if action_type:
        query = query.filter(models.CaseAction.action_type == action_type)

    total = query.count()
    items = query.order_by(desc(models.CaseAction.timestamp)).offset(skip).limit(limit).all()

    return {
        "data": [
            {
                "id": a.id,
                "case_id": a.case_id,
                "acting_user": a.acting_user,
                "action_type": a.action_type,
                "previous_value": a.previous_value,
                "new_value": a.new_value,
                "remarks": a.remarks,
                "timestamp": a.timestamp,
            }
            for a in items
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }
