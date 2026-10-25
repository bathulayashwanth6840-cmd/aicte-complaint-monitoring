from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, models, schemas

router = APIRouter(prefix="/institutions", tags=["Institutions"])


def format_institution_response(inst: models.Institution) -> Dict[str, Any]:
    total_cases = len(inst.complaints) if inst.complaints else 0
    open_cases = sum(
        1 for c in inst.complaints
        if c.status not in ["Resolved", "Closed", "Disposed", "Transferred"]
    ) if inst.complaints else 0

    return {
        "id": inst.id,
        "internal_id": inst.internal_id,
        "aicte_permanent_id": inst.aicte_permanent_id,
        "name": inst.name,
        "normalized_name": inst.normalized_name,
        "address": inst.address,
        "region": inst.region,
        "state": inst.state,
        "district": inst.district,
        "institution_type": inst.institution_type,
        "established_year": inst.established_year,
        "created_at": inst.created_at,
        "total_cases": total_cases,
        "open_cases": open_cases,
    }


@router.get("", response_model=Dict[str, Any])
def list_institutions(
    search: Optional[str] = Query(None, description="Search by name, PID, internal ID, state"),
    region: Optional[str] = Query("ALL", description="Filter by AICTE region"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List institutions with normalized search, regional filtering and pagination."""
    items, total = crud.get_institutions(
        db, search=search, region=region, skip=skip, limit=limit
    )
    formatted = [format_institution_response(inst) for inst in items]
    return {
        "data": formatted,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=schemas.InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_institution(
    inst_in: schemas.InstitutionCreate,
    db: Session = Depends(get_db),
):
    """Register a new institution with verified unique AICTE PID or internal ID."""
    # Check if PID already exists
    if inst_in.aicte_permanent_id:
        existing_pid = crud.get_institution_by_pid(db, inst_in.aicte_permanent_id.strip())
        if existing_pid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Institution with AICTE Permanent ID '{inst_in.aicte_permanent_id}' already registered.",
            )

    # Check if internal_id already exists if supplied
    if inst_in.internal_id:
        existing_internal = crud.get_institution_by_internal_id(db, inst_in.internal_id.strip())
        if existing_internal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Institution with Internal ID '{inst_in.internal_id}' already exists.",
            )

    # Check normalized name duplicate
    norm_name = crud.normalize_text(inst_in.name)
    existing_name = (
        db.query(models.Institution)
        .filter(models.Institution.normalized_name == norm_name)
        .first()
    )
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An institution with a matching or highly similar name already exists (ID: {existing_name.internal_id}).",
        )

    db_inst = crud.create_institution(db, inst_in)
    return format_institution_response(db_inst)


@router.get("/{institution_id}", response_model=schemas.InstitutionResponse)
def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve full details of an institution."""
    inst = crud.get_institution_by_id(db, institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID '{institution_id}' not found.",
        )
    return format_institution_response(inst)


@router.put("/{institution_id}", response_model=schemas.InstitutionResponse)
def update_institution(
    institution_id: int,
    inst_in: schemas.InstitutionUpdate,
    db: Session = Depends(get_db),
):
    """Update details of an institution."""
    inst = crud.get_institution_by_id(db, institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID '{institution_id}' not found.",
        )

    # Validate PID uniqueness if changing
    if inst_in.aicte_permanent_id and inst_in.aicte_permanent_id != inst.aicte_permanent_id:
        existing_pid = crud.get_institution_by_pid(db, inst_in.aicte_permanent_id.strip())
        if existing_pid and existing_pid.id != institution_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"AICTE Permanent ID '{inst_in.aicte_permanent_id}' is already registered to another institution.",
            )

    updated = crud.update_institution(db, inst, inst_in)
    return format_institution_response(updated)


@router.delete("/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
):
    """Delete an institution and its associated complaints (cascading)."""
    inst = crud.get_institution_by_id(db, institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID '{institution_id}' not found.",
        )
    crud.delete_institution(db, inst)
    return None


@router.get("/{institution_id}/complaints")
def get_institution_complaints(
    institution_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve complete linked complaint history for a specific institution."""
    inst = crud.get_institution_by_id(db, institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID '{institution_id}' not found.",
        )

    complaints, total = crud.get_complaints(
        db, institution_id=institution_id, limit=200
    )
    formatted_cases = []
    for c in complaints:
        meta = crud.compute_case_metadata(c)
        formatted_cases.append({
            "id": c.id,
            "institution_id": c.institution_id,
            "institution_name": inst.name,
            "institution_pid": inst.aicte_permanent_id,
            "region": inst.region,
            "complaint_category": c.complaint_category,
            "description": c.description,
            "received_date": c.received_date,
            "status": c.status,
            "priority": c.priority,
            "assigned_bureau": c.assigned_bureau,
            "assigned_officer": c.assigned_officer,
            "last_action": c.last_action,
            "next_action": c.next_action,
            "expected_disposal_date": c.expected_disposal_date,
            "days_pending": meta["days_pending"],
            "is_overdue": meta["is_overdue"],
            "has_overlap": meta["has_overlap"],
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        })

    return {
        "institution": format_institution_response(inst),
        "total_cases": total,
        "complaints": formatted_cases,
    }
