from datetime import date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, models, schemas

router = APIRouter(prefix="/complaints", tags=["Complaints & Cases"])


def format_case_response(case: models.ComplaintCase) -> Dict[str, Any]:
    meta = crud.compute_case_metadata(case)
    return {
        "id": case.id,
        "institution_id": case.institution_id,
        "institution_name": meta["institution_name"],
        "institution_pid": meta["institution_pid"],
        "region": meta["region"],
        "complaint_category": case.complaint_category,
        "description": case.description,
        "received_date": case.received_date,
        "status": case.status,
        "priority": case.priority,
        "assigned_bureau": case.assigned_bureau,
        "assigned_officer": case.assigned_officer,
        "last_action": case.last_action,
        "next_action": case.next_action,
        "expected_disposal_date": case.expected_disposal_date,
        "complainant_name": case.complainant_name,
        "complainant_type": case.complainant_type,
        "complainant_contact": case.complainant_contact,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "days_pending": meta["days_pending"],
        "is_overdue": meta["is_overdue"],
        "has_overlap": meta["has_overlap"],
        "actions": [
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
            for a in sorted((case.actions or []), key=lambda x: x.id, reverse=True)
        ],
    }


@router.get("", response_model=Dict[str, Any])
def list_complaints(
    search: Optional[str] = Query(None, description="Search across ID, description, complainant, officer, institution"),
    institution_id: Optional[int] = Query(None, description="Filter by Institution ID"),
    bureau: Optional[str] = Query("ALL", description="Filter by Assigned Bureau"),
    region: Optional[str] = Query("ALL", description="Filter by Region"),
    category: Optional[str] = Query("ALL", description="Filter by Category"),
    status: Optional[str] = Query("ALL", description="Filter by Case Status"),
    priority: Optional[str] = Query("ALL", description="Filter by Priority"),
    date_from: Optional[date] = Query(None, description="Received date from"),
    date_to: Optional[date] = Query(None, description="Received date to"),
    has_overlap: Optional[str] = Query("ALL", description="Filter by overlap flag: ALL, true, false"),
    only_overdue: bool = Query(False, description="Filter to overdue cases only"),
    sort_by: str = Query("received_date", description="Field to sort by"),
    sort_dir: str = Query("desc", description="Sort direction: asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Search and filter complaint cases with multi-facet filters and pagination."""
    cases, total = crud.get_complaints(
        db,
        search=search,
        institution_id=institution_id,
        bureau=bureau,
        region=region,
        category=category,
        status=status,
        priority=priority,
        date_from=date_from,
        date_to=date_to,
        has_overlap=has_overlap,
        only_overdue=only_overdue,
        sort_by=sort_by,
        sort_dir=sort_dir,
        skip=skip,
        limit=limit,
    )
    formatted = [format_case_response(c) for c in cases]
    return {
        "data": formatted,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_complaint(
    case_in: schemas.ComplaintCaseCreate,
    db: Session = Depends(get_db),
):
    """Register a new complaint case, generate audit trail, check cross-bureau overlap."""
    # Verify institution exists
    inst = crud.get_institution_by_id(db, case_in.institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID '{case_in.institution_id}' does not exist.",
        )

    # Check custom case id duplicate if provided
    if case_in.custom_case_id:
        existing = crud.get_complaint_by_id(db, case_in.custom_case_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Complaint case with ID '{case_in.custom_case_id}' already exists.",
            )

    db_case = crud.create_complaint(db, case_in)
    refreshed = crud.get_complaint_by_id(db, db_case.id)
    return format_case_response(refreshed or db_case)


@router.get("/{case_id}", response_model=Dict[str, Any])
def get_complaint(
    case_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full details of a complaint case, including audit history and linked relationships."""
    case = crud.get_complaint_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint case '{case_id}' not found.",
        )
    return format_case_response(case)


@router.put("/{case_id}", response_model=Dict[str, Any])
def update_complaint(
    case_id: str,
    case_in: schemas.ComplaintCaseUpdate,
    db: Session = Depends(get_db),
):
    """Update fields of an existing complaint case."""
    case = crud.get_complaint_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint case '{case_id}' not found.",
        )

    update_dict = case_in.model_dump(exclude_unset=True, exclude={"acting_user", "remarks"})
    for field, val in update_dict.items():
        if val is not None:
            setattr(case, field, val)

    # Log action if remarks or status changed
    if case_in.remarks or "status" in update_dict:
        action = models.CaseAction(
            case_id=case.id,
            acting_user=case_in.acting_user or "Authorized Officer",
            action_type="Case Details Modified",
            previous_value=None,
            new_value=case.status,
            remarks=case_in.remarks or "Administrative updates applied to case record.",
        )
        db.add(action)

    db.commit()
    refreshed = crud.get_complaint_by_id(db, case_id)
    return format_case_response(refreshed or case)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(
    case_id: str,
    db: Session = Depends(get_db),
):
    """Delete a complaint case and its linked action records (cascading)."""
    case = crud.get_complaint_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint case '{case_id}' not found.",
        )
    db.delete(case)
    db.commit()
    return None


@router.post("/{case_id}/assign", response_model=Dict[str, Any])
def assign_case(
    case_id: str,
    assign_in: schemas.CaseAssignmentUpdate,
    db: Session = Depends(get_db),
):
    """Assign or reassign a complaint to a Bureau/Cell and designated officer."""
    try:
        updated = crud.update_case_assignment(db, case_id, assign_in)
        refreshed = crud.get_complaint_by_id(db, case_id)
        return format_case_response(refreshed or updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{case_id}/status", response_model=Dict[str, Any])
def update_case_status(
    case_id: str,
    status_in: schemas.CaseStatusUpdate,
    db: Session = Depends(get_db),
):
    """Update workflow status of a case and append immutable audit log."""
    try:
        updated = crud.update_case_status(db, case_id, status_in)
        refreshed = crud.get_complaint_by_id(db, case_id)
        return format_case_response(refreshed or updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{case_id}/transfer", response_model=Dict[str, Any])
def transfer_case(
    case_id: str,
    transfer_in: schemas.CaseTransferRequest,
    db: Session = Depends(get_db),
):
    """Transfer case jurisdiction to external authority or other bureau."""
    try:
        updated = crud.transfer_case(db, case_id, transfer_in)
        refreshed = crud.get_complaint_by_id(db, case_id)
        return format_case_response(refreshed or updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{case_id}/escalate", response_model=Dict[str, Any])
def escalate_case(
    case_id: str,
    esc_in: schemas.CaseEscalationRequest,
    db: Session = Depends(get_db),
):
    """Escalate case for SLA breach or critical priority intervention."""
    try:
        updated = crud.escalate_case(db, case_id, esc_in)
        refreshed = crud.get_complaint_by_id(db, case_id)
        return format_case_response(refreshed or updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{case_id}/actions", response_model=List[schemas.CaseActionResponse])
def get_case_actions(
    case_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve chronologically ordered audit trail for a specific case."""
    case = crud.get_complaint_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint case '{case_id}' not found.",
        )
    return (
        db.query(models.CaseAction)
        .filter(models.CaseAction.case_id == case_id)
        .order_by(models.CaseAction.id.desc())
        .all()
    )


@router.get("/{case_id}/related")
def get_related_cases(
    case_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve all linked cases, overlaps, and cross-bureau dependencies for a case."""
    case = crud.get_complaint_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint case '{case_id}' not found.",
        )

    rels = (
        db.query(models.CaseRelationship)
        .filter(
            (models.CaseRelationship.first_case_id == case_id) |
            (models.CaseRelationship.second_case_id == case_id)
        )
        .all()
    )

    results = []
    for r in rels:
        partner_id = r.second_case_id if r.first_case_id == case_id else r.first_case_id
        partner_case = crud.get_complaint_by_id(db, partner_id)
        results.append({
            "relationship_id": r.id,
            "relationship_type": r.relationship_type,
            "matching_reason": r.matching_reason,
            "review_status": r.review_status,
            "reviewed_by": r.reviewed_by,
            "review_timestamp": r.review_timestamp,
            "review_remarks": r.review_remarks,
            "linked_case": {
                "id": partner_id,
                "bureau": partner_case.assigned_bureau if partner_case else "Unknown",
                "status": partner_case.status if partner_case else "Unknown",
                "category": partner_case.complaint_category if partner_case else "Unknown",
                "officer": partner_case.assigned_officer if partner_case else None,
            } if partner_case else None,
        })

    return results
