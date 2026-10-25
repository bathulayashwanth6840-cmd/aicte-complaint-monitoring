from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, models, schemas, overlap_engine

router = APIRouter(prefix="/overlaps", tags=["Cross-Bureau Overlap Detection Engine"])


def format_relationship_response(rel: models.CaseRelationship, db: Session) -> Dict[str, Any]:
    c1 = crud.get_complaint_by_id(db, rel.first_case_id)
    c2 = crud.get_complaint_by_id(db, rel.second_case_id)

    # Institution information from either or both cases
    inst1 = c1.institution if c1 else None
    inst2 = c2.institution if c2 else None

    # Fetch audit history actions for both cases regarding this overlap
    review_actions = (
        db.query(models.CaseAction)
        .filter(
            models.CaseAction.case_id.in_([rel.first_case_id, rel.second_case_id]),
            models.CaseAction.action_type.in_([
                "Relationship Confirmed",
                "Suggested Relationship Rejected",
                "Coordination Directive Issued",
                "Overlap Review Concluded",
                "Overlap Alert Flagged",
            ]),
        )
        .order_by(models.CaseAction.id.desc())
        .all()
    )

    review_history = [
        {
            "id": a.id,
            "case_id": a.case_id,
            "officer": a.acting_user,
            "action": a.action_type,
            "decision": a.new_value,
            "remarks": a.remarks,
            "timestamp": a.timestamp,
        }
        for a in review_actions
    ]

    return {
        "id": rel.id,
        "first_case_id": rel.first_case_id,
        "second_case_id": rel.second_case_id,
        "relationship_type": rel.relationship_type,
        "matching_reason": rel.matching_reason,
        "review_status": rel.review_status,
        "reviewed_by": rel.reviewed_by,
        "review_timestamp": rel.review_timestamp,
        "review_remarks": rel.review_remarks,
        "institution_name": inst1.name if inst1 else (inst2.name if inst2 else "Technical Institution"),
        "institution_pid": inst1.aicte_permanent_id if inst1 else (inst2.aicte_permanent_id if inst2 else None),
        "institution_internal_id": inst1.internal_id if inst1 else (inst2.internal_id if inst2 else None),
        "region": inst1.region if inst1 else (inst2.region if inst2 else None),
        "first_case": {
            "id": c1.id if c1 else rel.first_case_id,
            "institution_id": c1.institution_id if c1 else None,
            "institution_name": inst1.name if inst1 else None,
            "institution_pid": inst1.aicte_permanent_id if inst1 else None,
            "bureau": c1.assigned_bureau if c1 else "Unknown",
            "assigned_officer": c1.assigned_officer if c1 else None,
            "status": c1.status if c1 else "Unknown",
            "category": c1.complaint_category if c1 else "Unknown",
            "priority": c1.priority if c1 else "Medium",
            "received_date": c1.received_date if c1 else None,
            "expected_disposal_date": c1.expected_disposal_date if c1 else None,
        } if c1 else None,
        "second_case": {
            "id": c2.id if c2 else rel.second_case_id,
            "institution_id": c2.institution_id if c2 else None,
            "institution_name": inst2.name if inst2 else None,
            "institution_pid": inst2.aicte_permanent_id if inst2 else None,
            "bureau": c2.assigned_bureau if c2 else "Unknown",
            "assigned_officer": c2.assigned_officer if c2 else None,
            "status": c2.status if c2 else "Unknown",
            "category": c2.complaint_category if c2 else "Unknown",
            "priority": c2.priority if c2 else "Medium",
            "received_date": c2.received_date if c2 else None,
            "expected_disposal_date": c2.expected_disposal_date if c2 else None,
        } if c2 else None,
        "review_history": review_history,
    }


@router.get("", response_model=Dict[str, Any])
def list_overlaps(
    status: Optional[str] = Query("ALL", description="Filter by review status"),
    relationship_type: Optional[str] = Query("ALL", description="Filter by relationship type"),
    bureau: Optional[str] = Query("ALL", description="Filter by involved bureau"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List cross-bureau overlap records with multi-facet filtering."""
    query = db.query(models.CaseRelationship)

    if status and status != "ALL":
        query = query.filter(models.CaseRelationship.review_status == status)

    if relationship_type and relationship_type != "ALL":
        query = query.filter(models.CaseRelationship.relationship_type == relationship_type)

    total = query.count()
    items = query.order_by(models.CaseRelationship.id.desc()).offset(skip).limit(limit).all()
    formatted = [format_relationship_response(r, db) for r in items]

    # Post-filter by bureau if specified
    if bureau and bureau != "ALL":
        formatted = [
            f for f in formatted
            if (f["first_case"] and f["first_case"]["bureau"] == bureau) or
               (f["second_case"] and f["second_case"]["bureau"] == bureau)
        ]
        total = len(formatted)

    return {
        "data": formatted,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/scan")
def trigger_database_overlap_scan(db: Session = Depends(get_db)):
    """Run on-demand scan of all active cases in database using the Overlap Detection Engine."""
    stats = overlap_engine.scan_all_database_overlaps(db)
    return {
        "status": "Scan Complete",
        "details": stats,
    }


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_overlap_relationship(
    rel_in: schemas.CaseRelationshipCreate,
    db: Session = Depends(get_db),
):
    """Link two cases as a cross-bureau overlap or related grievance."""
    c1 = crud.get_complaint_by_id(db, rel_in.first_case_id)
    if not c1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ComplaintCase '{rel_in.first_case_id}' not found.",
        )

    c2 = crud.get_complaint_by_id(db, rel_in.second_case_id)
    if not c2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ComplaintCase '{rel_in.second_case_id}' not found.",
        )

    if rel_in.first_case_id == rel_in.second_case_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot link a case to itself.",
        )

    # Check if link already exists
    existing = overlap_engine.find_existing_relationship(db, rel_in.first_case_id, rel_in.second_case_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A relationship between '{rel_in.first_case_id}' and '{rel_in.second_case_id}' already exists (ID: {existing.id}).",
        )

    rel = crud.create_relationship(db, rel_in)
    return format_relationship_response(rel, db)


@router.get("/{overlap_id}", response_model=Dict[str, Any])
def get_overlap(
    overlap_id: int,
    db: Session = Depends(get_db),
):
    """Get full details of a specific overlap relationship including case metadata and review history."""
    rel = db.query(models.CaseRelationship).filter(models.CaseRelationship.id == overlap_id).first()
    if not rel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CaseRelationship with ID {overlap_id} not found.",
        )
    return format_relationship_response(rel, db)


@router.post("/{overlap_id}/review", response_model=Dict[str, Any])
def review_overlap(
    overlap_id: int,
    review_in: schemas.CaseRelationshipReviewUpdate,
    db: Session = Depends(get_db),
):
    """
    Review workflow for authorized officials:
    - CONFIRM: Confirm relationship
    - REJECT: Reject suggestion (preserves original complaints unaltered)
    - COORDINATION: Mandate coordination or joint hearing
    Records reviewer, timestamp, and audit remarks in immutable database history.
    """
    try:
        updated = crud.review_relationship(db, overlap_id, review_in)
        return format_relationship_response(updated, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
