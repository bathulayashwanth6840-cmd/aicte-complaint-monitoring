import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, desc, asc

from app import models, schemas


# ==========================================
# USER OPERATIONS
# ==========================================

def get_user_by_login(db: Session, login_identifier: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.login_identifier == login_identifier).first()


def hash_password(password: str) -> str:
    """Hash password using SHA-256 for secure storage."""
    import hashlib
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored cryptographic hash."""
    return hash_password(plain_password) == hashed_password


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    db_user = models.User(
        name=user_in.name,
        login_identifier=user_in.login_identifier,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        active_status=user_in.active_status,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ==========================================
# INSTITUTION OPERATIONS
# ==========================================

def normalize_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip().lower()


def get_institutions(
    db: Session,
    search: Optional[str] = None,
    region: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[models.Institution], int]:
    query = db.query(models.Institution)

    if search and search.strip():
        q_term = f"%{normalize_text(search)}%"
        raw_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Institution.normalized_name.like(q_term),
                models.Institution.internal_id.like(raw_term),
                models.Institution.aicte_permanent_id.like(raw_term),
                models.Institution.state.ilike(raw_term),
                models.Institution.district.ilike(raw_term),
            )
        )

    if region and region != "ALL":
        query = query.filter(models.Institution.region == region)

    total = query.count()
    institutions = query.order_by(models.Institution.name.asc()).offset(skip).limit(limit).all()
    return institutions, total


def get_institution_by_id(db: Session, institution_id: int) -> Optional[models.Institution]:
    return db.query(models.Institution).filter(models.Institution.id == institution_id).first()


def get_institution_by_pid(db: Session, pid: str) -> Optional[models.Institution]:
    return db.query(models.Institution).filter(models.Institution.aicte_permanent_id == pid).first()


def get_institution_by_internal_id(db: Session, internal_id: str) -> Optional[models.Institution]:
    return db.query(models.Institution).filter(models.Institution.internal_id == internal_id).first()


def create_institution(db: Session, inst_in: schemas.InstitutionCreate) -> models.Institution:
    # Auto-generate internal_id if missing
    internal_id = inst_in.internal_id
    if not internal_id:
        count = db.query(func.count(models.Institution.id)).scalar() or 0
        internal_id = f"AICTE-INST-{count + 1:03d}"

    norm_name = normalize_text(inst_in.name)

    db_inst = models.Institution(
        internal_id=internal_id,
        aicte_permanent_id=inst_in.aicte_permanent_id,
        name=inst_in.name.strip(),
        normalized_name=norm_name,
        address=inst_in.address,
        region=inst_in.region,
        state=inst_in.state,
        district=inst_in.district,
        institution_type=inst_in.institution_type or "Private-Self Financing",
        established_year=inst_in.established_year,
    )
    db.add(db_inst)
    db.commit()
    db.refresh(db_inst)
    return db_inst


def update_institution(
    db: Session, db_inst: models.Institution, inst_in: schemas.InstitutionUpdate
) -> models.Institution:
    update_data = inst_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"]:
        update_data["normalized_name"] = normalize_text(update_data["name"])

    for field, val in update_data.items():
        setattr(db_inst, field, val)

    db.commit()
    db.refresh(db_inst)
    return db_inst


def delete_institution(db: Session, db_inst: models.Institution) -> None:
    db.delete(db_inst)
    db.commit()


# ==========================================
# COMPLAINT CASE OPERATIONS
# ==========================================

def compute_case_metadata(case: models.ComplaintCase) -> Dict[str, Any]:
    from app import deadline_engine
    tl = deadline_engine.classify_case_timeline(case)

    # Check if this case has any active relationships
    has_overlap = len(case.primary_relationships) > 0 or len(case.secondary_relationships) > 0

    return {
        "days_pending": tl["days_pending"],
        "is_overdue": tl["is_overdue"],
        "is_approaching": tl["is_approaching"],
        "days_overdue": tl["days_overdue"],
        "days_remaining": tl["days_remaining"],
        "timeline_status": tl["timeline_status"],
        "has_overlap": has_overlap,
        "institution_name": case.institution.name if case.institution else None,
        "institution_pid": case.institution.aicte_permanent_id if case.institution else None,
        "region": case.institution.region if case.institution else None,
    }


def get_complaints(
    db: Session,
    search: Optional[str] = None,
    institution_id: Optional[int] = None,
    institution_name: Optional[str] = None,
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    has_overlap: Optional[str] = "ALL",  # "ALL", "true", "false", "OVERLAP_ONLY", "NO_OVERLAP"
    overlap_status: Optional[str] = "ALL",  # "ALL", "Pending Review", "Coordination Required", "Confirmed", "Rejected"
    only_overdue: bool = False,
    sort_by: str = "received_date",
    sort_dir: str = "desc",
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[models.ComplaintCase], int]:
    query = db.query(models.ComplaintCase).join(models.Institution).options(
        joinedload(models.ComplaintCase.institution),
        joinedload(models.ComplaintCase.actions),
        joinedload(models.ComplaintCase.primary_relationships),
        joinedload(models.ComplaintCase.secondary_relationships),
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.ComplaintCase.id.ilike(term),
                models.ComplaintCase.description.ilike(term),
                models.ComplaintCase.complainant_name.ilike(term),
                models.ComplaintCase.assigned_officer.ilike(term),
                models.Institution.name.ilike(term),
                models.Institution.aicte_permanent_id.ilike(term),
            )
        )

    if institution_id:
        query = query.filter(models.ComplaintCase.institution_id == institution_id)

    if institution_name and institution_name != "ALL":
        query = query.filter(models.Institution.name.ilike(f"%{institution_name.strip()}%"))

    if bureau and bureau != "ALL":
        query = query.filter(models.ComplaintCase.assigned_bureau == bureau)

    if region and region != "ALL":
        query = query.filter(models.Institution.region == region)

    if category and category != "ALL":
        query = query.filter(models.ComplaintCase.complaint_category == category)

    if status and status != "ALL":
        if status == "Under Process":
            query = query.filter(
                models.ComplaintCase.status.in_(
                    ["In Investigation", "Hearing Scheduled", "Action Initiated", "Assigned"]
                )
            )
        elif status == "Pending":
            query = query.filter(models.ComplaintCase.status.in_(["Pending", "Submitted"]))
        elif status == "Resolved":
            query = query.filter(models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed"]))
        else:
            query = query.filter(models.ComplaintCase.status == status)

    if priority and priority != "ALL":
        query = query.filter(models.ComplaintCase.priority == priority)

    if date_from:
        query = query.filter(models.ComplaintCase.received_date >= date_from)

    if date_to:
        query = query.filter(models.ComplaintCase.received_date <= date_to)

    if only_overdue:
        today = date.today()
        query = query.filter(
            and_(
                ~models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed", "Transferred"]),
                or_(
                    models.ComplaintCase.expected_disposal_date < today,
                    models.ComplaintCase.received_date < (today - timedelta(days=30)),
                ),
            )
        )

    # Overlap Review Status Filtering in SQL
    if overlap_status and overlap_status != "ALL":
        rel_subquery = db.query(models.CaseRelationship.id).filter(
            or_(
                models.CaseRelationship.first_case_id == models.ComplaintCase.id,
                models.CaseRelationship.second_case_id == models.ComplaintCase.id,
            ),
            models.CaseRelationship.review_status == overlap_status,
        )
        query = query.filter(rel_subquery.exists())
    elif has_overlap in ["true", "OVERLAP_ONLY"]:
        rel_subquery = db.query(models.CaseRelationship.id).filter(
            or_(
                models.CaseRelationship.first_case_id == models.ComplaintCase.id,
                models.CaseRelationship.second_case_id == models.ComplaintCase.id,
            )
        )
        query = query.filter(rel_subquery.exists())
    elif has_overlap in ["false", "NO_OVERLAP"]:
        rel_subquery = db.query(models.CaseRelationship.id).filter(
            or_(
                models.CaseRelationship.first_case_id == models.ComplaintCase.id,
                models.CaseRelationship.second_case_id == models.ComplaintCase.id,
            )
        )
        query = query.filter(~rel_subquery.exists())

    # Sort field
    sort_column = getattr(models.ComplaintCase, sort_by, models.ComplaintCase.received_date)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    cases = query.offset(skip).limit(limit).all()

    return cases, total


def get_complaint_by_id(db: Session, case_id: str) -> Optional[models.ComplaintCase]:
    return (
        db.query(models.ComplaintCase)
        .options(
            joinedload(models.ComplaintCase.institution),
            joinedload(models.ComplaintCase.actions),
            joinedload(models.ComplaintCase.primary_relationships),
            joinedload(models.ComplaintCase.secondary_relationships),
        )
        .filter(models.ComplaintCase.id == case_id)
        .first()
    )


def create_complaint(db: Session, case_in: schemas.ComplaintCaseCreate) -> models.ComplaintCase:
    # Generate Case ID if not custom
    case_id = case_in.custom_case_id
    if not case_id:
        count = db.query(func.count(models.ComplaintCase.id)).scalar() or 0
        case_id = f"AICTE-2026-C-{1000 + count + 1}"

    rec_date = case_in.received_date or date.today()
    exp_date = case_in.expected_disposal_date or (rec_date + timedelta(days=15))

    db_case = models.ComplaintCase(
        id=case_id,
        institution_id=case_in.institution_id,
        complaint_category=case_in.complaint_category,
        description=case_in.description,
        received_date=rec_date,
        status="Assigned" if case_in.assigned_officer else "Pending",
        priority=case_in.priority or "Medium",
        assigned_bureau=case_in.assigned_bureau or "PGRC",
        assigned_officer=case_in.assigned_officer,
        last_action=f"Case Docketed under category: {case_in.complaint_category}",
        next_action=case_in.next_action or "Issue formal inquiry notice to institution nodal officer",
        expected_disposal_date=exp_date,
        complainant_name=case_in.complainant_name,
        complainant_type=case_in.complainant_type or "Student",
        complainant_contact=case_in.complainant_contact,
    )
    db.add(db_case)
    db.flush()

    # Initial CaseAction audit record
    initial_action = models.CaseAction(
        case_id=case_id,
        acting_user=case_in.acting_user or "Intake Officer",
        action_type="Case Docketed",
        previous_value=None,
        new_value=db_case.status,
        remarks=f"Registered complaint against Institution ID {case_in.institution_id}. Routed to {db_case.assigned_bureau}.",
    )
    db.add(initial_action)

    db.commit()
    db.refresh(db_case)

    # Automated Cross-Bureau Overlap Check using Overlap Detection Engine
    from app import overlap_engine
    overlap_engine.detect_overlaps_for_case(db, db_case)

    # If critical priority, create notification
    if db_case.priority == "Critical":
        notif_crit = models.Notification(
            recipient="Bureau Lead",
            related_case_id=db_case.id,
            notification_type="CRITICAL_PRIORITY",
            message=f"Critical priority grievance docketed: {db_case.id}. Immediate triage required within 24 hours.",
        )
        db.add(notif_crit)

    db.commit()
    db.refresh(db_case)
    return db_case


def update_case_assignment(
    db: Session,
    case_id: str,
    update_in: schemas.CaseAssignmentUpdate,
) -> models.ComplaintCase:
    case = get_complaint_by_id(db, case_id)
    if not case:
        raise ValueError(f"ComplaintCase '{case_id}' not found.")

    old_bureau = case.assigned_bureau
    old_officer = case.assigned_officer

    case.assigned_bureau = update_in.assigned_bureau
    case.assigned_officer = update_in.assigned_officer
    case.last_action = f"Reassigned to {case.assigned_bureau} ({case.assigned_officer})"
    case.updated_at = datetime.now(timezone.utc)

    # Log CaseAction
    action = models.CaseAction(
        case_id=case.id,
        acting_user=update_in.acting_user,
        action_type="Reassignment",
        previous_value=f"{old_bureau} ({old_officer or 'Unassigned'})",
        new_value=f"{case.assigned_bureau} ({case.assigned_officer})",
        remarks=update_in.remarks or "Officer assignment updated by administrator.",
    )
    db.add(action)

    # Notification
    notif = models.Notification(
        recipient=case.assigned_officer,
        related_case_id=case.id,
        notification_type="ASSIGNMENT",
        message=f"You have been designated as lead officer for case {case.id}.",
    )
    db.add(notif)

    db.commit()
    db.refresh(case)

    # Re-evaluate overlaps when bureau assignment changes (Rule 5)
    from app import overlap_engine
    overlap_engine.detect_overlaps_for_case(db, case)

    return case


def update_case_status(
    db: Session,
    case_id: str,
    update_in: schemas.CaseStatusUpdate,
) -> models.ComplaintCase:
    case = get_complaint_by_id(db, case_id)
    if not case:
        raise ValueError(f"ComplaintCase '{case_id}' not found.")

    old_status = case.status
    case.status = update_in.status
    case.last_action = f"Status updated to: {case.status}"
    case.updated_at = datetime.now(timezone.utc)

    # Audit action
    action = models.CaseAction(
        case_id=case.id,
        acting_user=update_in.acting_user,
        action_type="Status Update",
        previous_value=old_status,
        new_value=case.status,
        remarks=update_in.remarks or f"Status transitioned from {old_status} to {case.status}.",
    )
    db.add(action)

    if case.status in ["Resolved", "Closed", "Disposed"]:
        notif = models.Notification(
            recipient="Complainant & Institution",
            related_case_id=case.id,
            notification_type="CASE_RESOLVED",
            message=f"Grievance case {case.id} has been formally closed and marked {case.status}.",
        )
        db.add(notif)

    db.commit()
    db.refresh(case)

    # Rule 10: Update or resolve alerts when case circumstances change
    from app import overlap_engine
    overlap_engine.update_relationships_on_status_change(db, case)

    return case


def transfer_case(
    db: Session,
    case_id: str,
    transfer_in: schemas.CaseTransferRequest,
) -> models.ComplaintCase:
    case = get_complaint_by_id(db, case_id)
    if not case:
        raise ValueError(f"ComplaintCase '{case_id}' not found.")

    old_status = case.status
    case.status = "Transferred"
    case.last_action = f"Transferred to {transfer_in.transfer_to}"
    case.updated_at = datetime.now(timezone.utc)

    action = models.CaseAction(
        case_id=case.id,
        acting_user=transfer_in.acting_user,
        action_type="Jurisdictional Transfer",
        previous_value=old_status,
        new_value=f"Transferred to {transfer_in.transfer_to}",
        remarks=f"Transfer Reason: {transfer_in.reason}",
    )
    db.add(action)

    notif = models.Notification(
        recipient=transfer_in.transfer_to,
        related_case_id=case.id,
        notification_type="CASE_TRANSFERRED",
        message=f"File {case.id} transferred to {transfer_in.transfer_to}. Reason: {transfer_in.reason}",
    )
    db.add(notif)

    db.commit()
    db.refresh(case)

    from app import overlap_engine
    overlap_engine.update_relationships_on_status_change(db, case)

    return case


def escalate_case(
    db: Session,
    case_id: str,
    esc_in: schemas.CaseEscalationRequest,
) -> models.ComplaintCase:
    case = get_complaint_by_id(db, case_id)
    if not case:
        raise ValueError(f"ComplaintCase '{case_id}' not found.")

    case.priority = "Critical"
    case.last_action = f"Escalated to {esc_in.escalate_to}"
    case.updated_at = datetime.now(timezone.utc)

    action = models.CaseAction(
        case_id=case.id,
        acting_user=esc_in.acting_user,
        action_type="SLA Escalation",
        previous_value="Normal SLA",
        new_value=f"Escalated to {esc_in.escalate_to}",
        remarks=f"Escalation Reason: {esc_in.reason}",
    )
    db.add(action)

    notif = models.Notification(
        recipient=esc_in.escalate_to,
        related_case_id=case.id,
        notification_type="SLA_BREACH",
        message=f"URGENT: Case {case.id} escalated to {esc_in.escalate_to}. Reason: {esc_in.reason}",
    )
    db.add(notif)

    db.commit()
    db.refresh(case)
    return case


# ==========================================
# RELATIONSHIPS & OVERLAPS
# ==========================================

def get_relationships(
    db: Session,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[models.CaseRelationship], int]:
    query = db.query(models.CaseRelationship)
    if status and status != "ALL":
        query = query.filter(models.CaseRelationship.review_status == status)

    total = query.count()
    rels = query.order_by(models.CaseRelationship.id.desc()).offset(skip).limit(limit).all()
    return rels, total


def create_relationship(
    db: Session, rel_in: schemas.CaseRelationshipCreate
) -> models.CaseRelationship:
    db_rel = models.CaseRelationship(
        first_case_id=rel_in.first_case_id,
        second_case_id=rel_in.second_case_id,
        relationship_type=rel_in.relationship_type,
        matching_reason=rel_in.matching_reason,
        review_status="Pending Review",
    )
    db.add(db_rel)
    db.commit()
    db.refresh(db_rel)
    return db_rel


def review_relationship(
    db: Session,
    rel_id: int,
    review_in: schemas.CaseRelationshipReviewUpdate,
) -> models.CaseRelationship:
    rel = db.query(models.CaseRelationship).filter(models.CaseRelationship.id == rel_id).first()
    if not rel:
        raise ValueError(f"CaseRelationship with ID {rel_id} not found.")

    rel.review_status = review_in.review_status
    rel.reviewed_by = review_in.reviewed_by
    rel.review_timestamp = datetime.now(timezone.utc)
    rel.review_remarks = review_in.review_remarks

    # Determine specialized audit action type based on review decision
    if review_in.review_status == "Rejected":
        action_type = "Suggested Relationship Rejected"
        audit_remarks = f"Relationship rejected: {review_in.review_remarks or 'Independent cases confirmed; no overlap action required.'} Both cases preserved unaltered."
    elif review_in.review_status in ["Coordination Required", "Coordination Mandated", "Joint Hearing Constituted"]:
        action_type = "Coordination Directive Issued"
        audit_remarks = f"Coordination mandated: {review_in.review_remarks or 'Joint coordination protocol initiated under Rule 8(c).'}"
    elif review_in.review_status == "Confirmed":
        action_type = "Relationship Confirmed"
        audit_remarks = f"Relationship confirmed by official: {review_in.review_remarks or 'Cross-bureau inquiry alignment confirmed.'}"
    else:
        action_type = "Overlap Review Concluded"
        audit_remarks = f"Relationship reviewed: {review_in.review_remarks or 'Review decision recorded.'}"

    # Audit on both linked cases
    for case_id in [rel.first_case_id, rel.second_case_id]:
        action = models.CaseAction(
            case_id=case_id,
            acting_user=review_in.reviewed_by,
            action_type=action_type,
            previous_value="Pending Review",
            new_value=review_in.review_status,
            remarks=audit_remarks,
        )
        db.add(action)

    db.commit()
    db.refresh(rel)
    return rel


# ==========================================
# NOTIFICATIONS OPERATIONS
# ==========================================

def get_notifications(
    db: Session,
    recipient: Optional[str] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[models.Notification], int]:
    query = db.query(models.Notification)

    if recipient:
        query = query.filter(models.Notification.recipient == recipient)

    if unread_only:
        query = query.filter(models.Notification.read_status == False)

    total = query.count()
    notifs = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifs, total


def mark_notification_as_read(db: Session, notif_id: int) -> Optional[models.Notification]:
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if notif:
        notif.read_status = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_notifications_as_read(db: Session, recipient: Optional[str] = None) -> int:
    query = db.query(models.Notification).filter(models.Notification.read_status == False)
    if recipient:
        query = query.filter(models.Notification.recipient == recipient)

    updated_count = query.update({"read_status": True})
    db.commit()
    return updated_count


# ==========================================
# DASHBOARD CALCULATIONS (SQL-DRIVEN)
# ==========================================

def get_dashboard_statistics(db: Session) -> Dict[str, Any]:
    today = date.today()

    total_cases = db.query(func.count(models.ComplaintCase.id)).scalar() or 0
    total_institutions = db.query(func.count(models.Institution.id)).scalar() or 0

    pending_cases = (
        db.query(func.count(models.ComplaintCase.id))
        .filter(models.ComplaintCase.status.in_(["Pending", "Submitted"]))
        .scalar()
        or 0
    )

    under_process_cases = (
        db.query(func.count(models.ComplaintCase.id))
        .filter(
            models.ComplaintCase.status.in_(
                ["In Investigation", "Hearing Scheduled", "Action Initiated", "Assigned"]
            )
        )
        .scalar()
        or 0
    )

    disposed_cases = (
        db.query(func.count(models.ComplaintCase.id))
        .filter(models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed"]))
        .scalar()
        or 0
    )

    transferred_cases = (
        db.query(func.count(models.ComplaintCase.id))
        .filter(models.ComplaintCase.status == "Transferred")
        .scalar()
        or 0
    )

    # Overdue cases query
    overdue_cases = (
        db.query(func.count(models.ComplaintCase.id))
        .filter(
            and_(
                ~models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed", "Transferred"]),
                or_(
                    models.ComplaintCase.expected_disposal_date < today,
                    models.ComplaintCase.received_date < (today - timedelta(days=30)),
                ),
            )
        )
        .scalar()
        or 0
    )

    unresolved_overlaps = (
        db.query(func.count(models.CaseRelationship.id))
        .filter(models.CaseRelationship.review_status != "Resolved")
        .scalar()
        or 0
    )

    res_rate = round((disposed_cases / total_cases * 100), 1) if total_cases > 0 else 0.0

    return {
        "total_cases": total_cases,
        "pending_cases": pending_cases,
        "under_process_cases": under_process_cases,
        "disposed_cases": disposed_cases,
        "transferred_cases": transferred_cases,
        "overdue_cases": overdue_cases,
        "unresolved_overlaps": unresolved_overlaps,
        "total_institutions": total_institutions,
        "resolution_rate": res_rate,
    }


def get_bureau_workload_statistics(db: Session) -> List[Dict[str, Any]]:
    today = date.today()
    bureaus = [
        {"id": "PGRC", "code": "PGRC", "name": "Public Grievance Redressal Cell"},
        {"id": "RB", "code": "RB", "name": "Regulation Bureau"},
        {"id": "AB", "code": "AB", "name": "Approval Bureau"},
        {"id": "PAB", "code": "PAB", "name": "Policy & Academic Planning Bureau"},
        {"id": "ICC", "code": "ICC", "name": "Internal Complaints Committee"},
        {"id": "SCST", "code": "SC/ST", "name": "SC/ST Special Cell"},
    ]

    result = []
    for b in bureaus:
        active = (
            db.query(func.count(models.ComplaintCase.id))
            .filter(
                models.ComplaintCase.assigned_bureau == b["code"],
                ~models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed", "Transferred"]),
            )
            .scalar()
            or 0
        )

        disposed = (
            db.query(func.count(models.ComplaintCase.id))
            .filter(
                models.ComplaintCase.assigned_bureau == b["code"],
                models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed"]),
            )
            .scalar()
            or 0
        )

        overdue = (
            db.query(func.count(models.ComplaintCase.id))
            .filter(
                models.ComplaintCase.assigned_bureau == b["code"],
                ~models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed", "Transferred"]),
                or_(
                    models.ComplaintCase.expected_disposal_date < today,
                    models.ComplaintCase.received_date < (today - timedelta(days=30)),
                ),
            )
            .scalar()
            or 0
        )

        result.append({
            "bureau_id": b["id"],
            "code": b["code"],
            "name": b["name"],
            "active_cases": active,
            "disposed_cases": disposed,
            "overdue_cases": overdue,
            "total": active + disposed,
        })

    return result


def get_region_distribution_statistics(db: Session) -> List[Dict[str, Any]]:
    today = date.today()
    regions = [
        "Western",
        "North Western",
        "South Western",
        "South Central",
        "Eastern",
        "Southern",
        "Central",
    ]

    result = []
    for r in regions:
        total = (
            db.query(func.count(models.ComplaintCase.id))
            .join(models.Institution)
            .filter(models.Institution.region == r)
            .scalar()
            or 0
        )

        overdue = (
            db.query(func.count(models.ComplaintCase.id))
            .join(models.Institution)
            .filter(
                models.Institution.region == r,
                ~models.ComplaintCase.status.in_(["Resolved", "Closed", "Disposed", "Transferred"]),
                or_(
                    models.ComplaintCase.expected_disposal_date < today,
                    models.ComplaintCase.received_date < (today - timedelta(days=30)),
                ),
            )
            .scalar()
            or 0
        )

        result.append({
            "region": r,
            "total_cases": total,
            "overdue_cases": overdue,
        })

    return result


def get_status_distribution_statistics(db: Session) -> List[Dict[str, Any]]:
    stats = get_dashboard_statistics(db)
    return [
        {"name": "Under Process", "value": stats["under_process_cases"], "color": "#2563eb"},
        {"name": "Pending Review", "value": stats["pending_cases"], "color": "#f59e0b"},
        {"name": "Disposed / Closed", "value": stats["disposed_cases"], "color": "#10b981"},
        {"name": "Transferred", "value": stats["transferred_cases"], "color": "#6366f1"},
        {"name": "Overdue SLA", "value": stats["overdue_cases"], "color": "#ef4444"},
    ]
