from datetime import date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import crud, models, schemas

router = APIRouter(prefix="/dashboard", tags=["Dashboard Statistics"])


@router.get("/stats", response_model=schemas.DashboardStatsResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Retrieve real-time aggregate statistics calculated directly from SQL queries."""
    return crud.get_dashboard_statistics(db)


@router.get("/bureau-workload", response_model=List[schemas.BureauWorkloadItem])
def get_bureau_workload(db: Session = Depends(get_db)):
    """Bureau-wise active, disposed, overdue and total workload breakdown."""
    return crud.get_bureau_workload_statistics(db)


@router.get("/region-distribution", response_model=List[schemas.RegionDistributionItem])
def get_region_distribution(db: Session = Depends(get_db)):
    """Region-wise case and overdue distribution."""
    return crud.get_region_distribution_statistics(db)


@router.get("/status-distribution", response_model=List[schemas.StatusDistributionItem])
def get_status_distribution(db: Session = Depends(get_db)):
    """Complaint workflow status breakdown for charts."""
    return crud.get_status_distribution_statistics(db)


@router.get("/recent-activity")
def get_recent_activity(db: Session = Depends(get_db)):
    """Recent 10 case audit events for the dashboard timeline."""
    actions = (
        db.query(models.CaseAction)
        .order_by(desc(models.CaseAction.timestamp))
        .limit(10)
        .all()
    )
    return [
        {
            "id": f"ACT-{a.id}",
            "case_id": a.case_id,
            "acting_user": a.acting_user,
            "action_type": a.action_type,
            "remarks": a.remarks,
            "timestamp": a.timestamp,
        }
        for a in actions
    ]


@router.get("/approaching-deadlines")
def get_approaching_deadlines(db: Session = Depends(get_db)):
    """Cases with deadlines within the next 7 days or already overdue."""
    today = date.today()
    target_date = today + timedelta(days=7)

    cases = (
        db.query(models.ComplaintCase)
        .filter(
            ~models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed", "Transferred"]),
            models.ComplaintCase.expected_disposal_date != None,
            models.ComplaintCase.expected_disposal_date <= target_date,
        )
        .order_by(models.ComplaintCase.expected_disposal_date.asc())
        .limit(10)
        .all()
    )

    results = []
    for c in cases:
        meta = crud.compute_case_metadata(c)
        results.append({
            "id": c.id,
            "institution_name": c.institution.name if c.institution else "Unknown",
            "assigned_bureau": c.assigned_bureau,
            "priority": c.priority,
            "status": c.status,
            "expected_disposal_date": c.expected_disposal_date,
            "days_pending": meta["days_pending"],
            "is_overdue": meta["is_overdue"],
        })
    return results
