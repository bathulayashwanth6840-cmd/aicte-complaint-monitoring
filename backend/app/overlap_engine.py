import re
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app import models

# ==========================================
# 1. TEXT & NAME NORMALIZATION HELPERS
# ==========================================

COMMON_ABBREVIATIONS = {
    r"\bengg\b": "engineering",
    r"\btech\b": "technology",
    r"\binst\b": "institute",
    r"\bdept\b": "department",
    r"\buniv\b": "university",
    r"\bmgmt\b": "management",
    r"\bpoly\b": "polytechnic",
    r"\bcoll\b": "college",
    r"\bacad\b": "academy",
    r"\bgovt\b": "government",
    r"\bpvt\b": "private",
    r"\bltd\b": "limited",
}

STOP_SUFFIXES = [
    r"\bpvt\.?\s*ltd\.?\b",
    r"\bprivate\s+limited\b",
    r"\btrust\b",
    r"\bsociety\b",
    r"\bcampus\b",
    r"\bmain\s+campus\b",
]


def normalize_institution_name(name: str) -> str:
    """Normalize institution names to handle case, spacing, punctuation and common abbreviations."""
    if not name:
        return ""
    text = name.lower()

    # Expand common abbreviations
    for pattern, replacement in COMMON_ABBREVIATIONS.items():
        text = re.sub(pattern, replacement, text)

    # Strip organizational legal suffixes
    for suffix in STOP_SUFFIXES:
        text = re.sub(suffix, "", text)

    # Remove punctuation except alphanumeric and spaces
    text = re.sub(r"[^\w\s]", " ", text)
    # Collapse multiple whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def calculate_name_similarity(name1: str, name2: str) -> float:
    """Calculate token-aware string similarity ratio between two institution names."""
    norm1 = normalize_institution_name(name1)
    norm2 = normalize_institution_name(name2)
    if not norm1 or not norm2:
        return 0.0
    if norm1 == norm2:
        return 1.0

    # Sequence matcher ratio
    seq_ratio = SequenceMatcher(None, norm1, norm2).ratio()

    # Token overlap ratio (Jaccard similarity on tokens)
    tokens1 = set(norm1.split())
    tokens2 = set(norm2.split())
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    jaccard_ratio = len(intersection) / len(union) if union else 0.0

    return round(max(seq_ratio, jaccard_ratio), 3)


def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate textual similarity between two complaint descriptions or subjects."""
    if not text1 or not text2:
        return 0.0
    clean1 = re.sub(r"[^\w\s]", " ", text1.lower())
    clean2 = re.sub(r"[^\w\s]", " ", text2.lower())
    clean1 = re.sub(r"\s+", " ", clean1).strip()
    clean2 = re.sub(r"\s+", " ", clean2).strip()

    if clean1 == clean2:
        return 1.0

    return round(SequenceMatcher(None, clean1, clean2).ratio(), 3)


# ==========================================
# 2. OVERLAP ENGINE CORE LOGIC
# ==========================================

CLOSED_STATUSES = ["Resolved", "Closed", "Disposed", "Transferred"]


def find_existing_relationship(
    db: Session, case_id_1: str, case_id_2: str
) -> Optional[models.CaseRelationship]:
    """Check if a relationship already exists between two cases in either direction."""
    return (
        db.query(models.CaseRelationship)
        .filter(
            or_(
                and_(
                    models.CaseRelationship.first_case_id == case_id_1,
                    models.CaseRelationship.second_case_id == case_id_2,
                ),
                and_(
                    models.CaseRelationship.first_case_id == case_id_2,
                    models.CaseRelationship.second_case_id == case_id_1,
                ),
            )
        )
        .first()
    )


def evaluate_case_pair(
    case1: models.ComplaintCase, case2: models.ComplaintCase
) -> Optional[Dict[str, Any]]:
    """
    Evaluate two complaint cases against AICTE matching rules:
    Rule 1: Match by verified AICTE PID where available.
    Rule 2: Normalize names.
    Rule 3: Fuzzy matching ONLY suggests possible identity matches when unverified.
    Rule 4: NEVER merge institutions because names are similar.
    Rule 6: Detect potentially overlapping open cases assigned to different Bureaus.
    Rule 7: Distinguish institution-level overlap from potential duplicate complaints.
    Rule 8: Compare complaint categories, descriptions, references.
    """
    if case1.id == case2.id:
        return None

    inst1 = case1.institution
    inst2 = case2.institution
    if not inst1 or not inst2:
        return None

    pid1 = (inst1.aicte_permanent_id or "").strip()
    pid2 = (inst2.aicte_permanent_id or "").strip()

    is_same_institution = False
    is_fuzzy_identity_suggestion = False
    name_similarity = calculate_name_similarity(inst1.name, inst2.name)

    # -------------------------------------------------------------
    # Step A: Institution Identity Verification
    # -------------------------------------------------------------
    if pid1 and pid2:
        # Both institutions have verified AICTE Permanent IDs
        if pid1 == pid2:
            is_same_institution = True
        else:
            # RULE B SAFEGUARD: Different verified identifiers MUST NOT be merged or linked as same institution
            return None
    elif inst1.id == inst2.id:
        # Same internal database institution entity
        is_same_institution = True
    else:
        # At least one institution lacks a verified PID: evaluate fuzzy similarity
        if name_similarity >= 0.85:
            # Suggest possible identity match ONLY (never merged)
            is_fuzzy_identity_suggestion = True
        else:
            # RULE C SAFEGUARD: Different institutions with low similarity are never matched
            return None

    # -------------------------------------------------------------
    # Step B: Case Status & Workload Cross-Bureau Checks
    # -------------------------------------------------------------
    case1_is_open = case1.status not in CLOSED_STATUSES
    case2_is_open = case2.status not in CLOSED_STATUSES

    # We only generate active coordination alerts if both cases are open
    if not (case1_is_open and case2_is_open):
        return None

    is_cross_bureau = case1.assigned_bureau != case2.assigned_bureau
    desc_similarity = calculate_text_similarity(case1.description, case2.description)
    same_category = case1.complaint_category.lower() == case2.complaint_category.lower()

    # -------------------------------------------------------------
    # Step C: Classification of Overlap Type
    # -------------------------------------------------------------
    if is_fuzzy_identity_suggestion:
        return {
            "first_case_id": case1.id,
            "second_case_id": case2.id,
            "relationship_type": "Suggested Institution Identity Match",
            "matching_reason": (
                f"Unverified institution name similarity ({int(name_similarity * 100)}%) between "
                f"'{inst1.name}' and '{inst2.name}'. Advisory suggestion only; records remain unmerged pending verified AICTE PID."
            ),
            "review_status": "Pending Review",
        }

    # If same verified institution:
    if is_same_institution:
        # Check if descriptions or categories indicate a potential duplicate complaint
        if same_category and desc_similarity >= 0.60:
            return {
                "first_case_id": case1.id,
                "second_case_id": case2.id,
                "relationship_type": "Potential Duplicate Grievance",
                "matching_reason": (
                    f"Identical institution (PID: {pid1 or inst1.internal_id}) with matching category '{case1.complaint_category}' "
                    f"and {int(desc_similarity * 100)}% narrative description similarity across {case1.assigned_bureau} and {case2.assigned_bureau}."
                ),
                "review_status": "Pending Review",
            }

        # Check if cases are assigned to different Bureaus/Cells
        if is_cross_bureau:
            return {
                "first_case_id": case1.id,
                "second_case_id": case2.id,
                "relationship_type": "Cross-Bureau Coordination Overlap",
                "matching_reason": (
                    f"Simultaneous active inquiries for institution '{inst1.name}' (PID: {pid1 or inst1.internal_id}) "
                    f"under {case1.assigned_bureau} ({case1.id}) and {case2.assigned_bureau} ({case2.id}). Coordination required."
                ),
                "review_status": "Pending Review",
            }

    return None


def detect_overlaps_for_case(
    db: Session, target_case: models.ComplaintCase
) -> List[models.CaseRelationship]:
    """
    Inspect all other active cases for overlap with the target case.
    Avoids duplicate alerts for already tracked relationships (Rule 9).
    Logs audit events and notifies relevant bureau leads.
    """
    other_cases = (
        db.query(models.ComplaintCase)
        .filter(models.ComplaintCase.id != target_case.id)
        .all()
    )

    created_relationships = []

    for other in other_cases:
        overlap_info = evaluate_case_pair(target_case, other)
        if not overlap_info:
            continue

        # RULE 9: Avoid duplicate alerts for the same unresolved relationship
        existing = find_existing_relationship(db, target_case.id, other.id)
        if existing:
            # Relationship already recorded
            continue

        # Create new CaseRelationship record
        rel = models.CaseRelationship(
            first_case_id=overlap_info["first_case_id"],
            second_case_id=overlap_info["second_case_id"],
            relationship_type=overlap_info["relationship_type"],
            matching_reason=overlap_info["matching_reason"],
            review_status=overlap_info["review_status"],
        )
        db.add(rel)
        db.flush()

        # Audit action on both linked cases
        for case_id in [target_case.id, other.id]:
            action = models.CaseAction(
                case_id=case_id,
                acting_user="AICTE Overlap Engine",
                action_type="Overlap Alert Flagged",
                previous_value=None,
                new_value=rel.relationship_type,
                remarks=rel.matching_reason,
            )
            db.add(action)

        # Send coordination notification
        notif = models.Notification(
            recipient="AICTE HQ Coordination Bench",
            related_case_id=target_case.id,
            notification_type="OVERLAP_ALERT",
            message=f"{rel.relationship_type}: Case {target_case.id} overlaps with {other.id}. {rel.matching_reason}",
        )
        db.add(notif)

        created_relationships.append(rel)

    db.commit()
    return created_relationships


def update_relationships_on_status_change(
    db: Session, case: models.ComplaintCase
) -> int:
    """
    RULE 10: Update or resolve alerts when case circumstances change.
    When a case is resolved, closed, or transferred, updates open relationships.
    """
    if case.status not in CLOSED_STATUSES:
        return 0

    active_rels = (
        db.query(models.CaseRelationship)
        .filter(
            or_(
                models.CaseRelationship.first_case_id == case.id,
                models.CaseRelationship.second_case_id == case.id,
            ),
            models.CaseRelationship.review_status == "Pending Review",
        )
        .all()
    )

    updated_count = 0
    for rel in active_rels:
        rel.review_status = "Resolved - Inactive Case"
        rel.review_timestamp = datetime.now(timezone.utc)
        rel.review_remarks = (
            f"Alert archived because linked case {case.id} reached terminal status: {case.status}."
        )
        updated_count += 1

    if updated_count > 0:
        db.commit()

    return updated_count


def scan_all_database_overlaps(db: Session) -> Dict[str, Any]:
    """Scan all open cases across all bureaus in the database and return detection statistics."""
    open_cases = (
        db.query(models.ComplaintCase)
        .filter(~models.ComplaintCase.status.in_(CLOSED_STATUSES))
        .all()
    )

    new_count = 0
    checked_pairs = 0

    for i in range(len(open_cases)):
        for j in range(i + 1, len(open_cases)):
            c1 = open_cases[i]
            c2 = open_cases[j]
            checked_pairs += 1

            overlap_info = evaluate_case_pair(c1, c2)
            if not overlap_info:
                continue

            existing = find_existing_relationship(db, c1.id, c2.id)
            if not existing:
                rel = models.CaseRelationship(
                    first_case_id=overlap_info["first_case_id"],
                    second_case_id=overlap_info["second_case_id"],
                    relationship_type=overlap_info["relationship_type"],
                    matching_reason=overlap_info["matching_reason"],
                    review_status=overlap_info["review_status"],
                )
                db.add(rel)
                new_count += 1

    if new_count > 0:
        db.commit()

    total_active_overlaps = (
        db.query(models.CaseRelationship)
        .filter(models.CaseRelationship.review_status == "Pending Review")
        .count()
    )

    return {
        "checked_case_pairs": checked_pairs,
        "new_overlaps_detected": new_count,
        "total_pending_overlaps": total_active_overlaps,
    }
