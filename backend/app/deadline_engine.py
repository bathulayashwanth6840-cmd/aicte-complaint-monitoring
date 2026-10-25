from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app import models

# ==========================================
# 1. CONFIGURABLE DEADLINE THRESHOLDS
# ==========================================

DEFAULT_CONFIG: Dict[str, int] = {
    "approaching_threshold_days": 3,      # SLA warning trigger window (days before expected disposal)
    "pending_reminder_days": 3,          # Remind if case remains unassigned/pending for >= N days
    "overdue_escalation_days": 7,        # Escalate to AICTE HQ leadership if overdue by >= N days
    "standard_sla_days": 15,             # Standard Citizen Charter target SLA for grievance inquiry
}

# In-memory configurable thresholds (can be updated via API)
CURRENT_CONFIG: Dict[str, int] = dict(DEFAULT_CONFIG)

CLOSED_STATUSES = ["Resolved", "Closed", "Disposed", "Transferred"]


def get_deadline_config() -> Dict[str, int]:
    """Retrieve current configurable deadline thresholds."""
    return dict(CURRENT_CONFIG)


def update_deadline_config(updates: Dict[str, int]) -> Dict[str, int]:
    """Update configurable deadline thresholds with validation."""
    for key, val in updates.items():
        if key in CURRENT_CONFIG and isinstance(val, int) and val > 0:
            CURRENT_CONFIG[key] = val
    return dict(CURRENT_CONFIG)


# ==========================================
# 2. TIMELINE CLASSIFICATION RULES
# ==========================================

def classify_case_timeline(
    case: models.ComplaintCase,
    today: Optional[date] = None,
    config: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    """
    Classify a case's timeline status under verified AICTE administrative rules:
    - Approaching deadline: 0 <= (expected_disposal_date - today) <= threshold and not closed.
    - Overdue: today > expected_disposal_date and not closed.
    - Closed / Disposed cases are NEVER approaching or overdue.
    - Calculates days_pending, days_remaining, days_overdue accurately.
    """
    if today is None:
        today = date.today()
    if config is None:
        config = CURRENT_CONFIG

    rec_date = case.received_date or today
    days_pending = max(0, (today - rec_date).days)

    is_closed = case.status in CLOSED_STATUSES
    due_date = case.expected_disposal_date
    if due_date is None:
        # Administrative target SLA default
        due_date = rec_date + timedelta(days=config.get("standard_sla_days", 15))

    days_to_due = (due_date - today).days

    is_overdue = False
    is_approaching = False
    is_escalated = False
    days_overdue = 0
    days_remaining = 0
    timeline_status = "ON_TRACK"

    if is_closed:
        timeline_status = "CONCLUDED"
    else:
        if days_to_due < 0:
            is_overdue = True
            days_overdue = abs(days_to_due)
            if days_overdue >= config.get("overdue_escalation_days", 7):
                is_escalated = True
                timeline_status = "OVERDUE_ESCALATED"
            else:
                timeline_status = "OVERDUE"
        elif 0 <= days_to_due <= config.get("approaching_threshold_days", 3):
            is_approaching = True
            days_remaining = days_to_due
            timeline_status = "APPROACHING_DEADLINE"
        else:
            days_remaining = days_to_due
            timeline_status = "ON_TRACK"

    # Pending reminder check
    is_pending_reminder_due = (
        not is_closed
        and case.status in ["Pending", "Submitted"]
        and days_pending >= config.get("pending_reminder_days", 3)
    )

    # Calculate ageing bucket
    if days_pending <= 7:
        ageing_bucket = "0-7 Days"
    elif days_pending <= 15:
        ageing_bucket = "8-15 Days"
    elif days_pending <= 30:
        ageing_bucket = "16-30 Days"
    elif days_pending <= 60:
        ageing_bucket = "31-60 Days"
    else:
        ageing_bucket = ">60 Days"

    return {
        "days_pending": days_pending,
        "due_date": due_date,
        "is_closed": is_closed,
        "is_overdue": is_overdue,
        "is_approaching": is_approaching,
        "is_escalated": is_escalated,
        "days_overdue": days_overdue,
        "days_remaining": days_remaining,
        "timeline_status": timeline_status,
        "is_pending_reminder_due": is_pending_reminder_due,
        "ageing_bucket": ageing_bucket,
    }


# ==========================================
# 3. NOTIFICATION DEDUPLICATION & MONITORING SCAN
# ==========================================

def _has_recent_notification(
    db: Session,
    case_id: str,
    notification_type: str,
    today: date,
    window_hours: int = 24,
) -> bool:
    """
    Avoid repeated notifications for the same event unless a new reminder is due.
    Checks if a notification of notification_type for this case was created recently.
    """
    cutoff = datetime.combine(today - timedelta(days=1), datetime.min.time())
    existing = (
        db.query(models.Notification)
        .filter(
            models.Notification.related_case_id == case_id,
            models.Notification.notification_type == notification_type,
            models.Notification.created_at >= cutoff,
        )
        .first()
    )
    return existing is not None


def run_deadline_monitoring_scan(
    db: Session,
    config: Optional[Dict[str, int]] = None,
    today: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Inspect all open cases across all Bureaus and emit notifications:
    1. Approaching-deadline reminders
    2. Overdue-case alerts
    3. Escalation notifications (severe overdue >= escalation threshold)
    4. Pending-case reminders (unassigned >= threshold)
    Enforces deduplication to prevent duplicate notifications for the same event.
    """
    if today is None:
        today = date.today()
    if config is None:
        config = CURRENT_CONFIG

    open_cases = (
        db.query(models.ComplaintCase)
        .filter(~models.ComplaintCase.status.in_(CLOSED_STATUSES))
        .all()
    )

    approaching_count = 0
    overdue_count = 0
    escalated_count = 0
    pending_reminders_count = 0
    new_notifications_count = 0

    for case in open_cases:
        tl = classify_case_timeline(case, today=today, config=config)
        inst_name = case.institution.name if case.institution else "Technical Institution"
        officer_or_lead = case.assigned_officer or f"{case.assigned_bureau} Bureau Lead"

        # 1. Approaching Deadline Reminder
        if tl["is_approaching"]:
            approaching_count += 1
            if not _has_recent_notification(db, case.id, "APPROACHING_DEADLINE_REMINDER", today):
                msg = (
                    f"Approaching Target SLA: Case {case.id} against '{inst_name}' is due in "
                    f"{tl['days_remaining']} day(s) on {tl['due_date'].isoformat()}. Priority: {case.priority}."
                )
                notif = models.Notification(
                    recipient=officer_or_lead,
                    related_case_id=case.id,
                    notification_type="APPROACHING_DEADLINE_REMINDER",
                    message=msg,
                    read_status=False,
                )
                db.add(notif)
                new_notifications_count += 1

        # 2. Overdue Case Alert
        if tl["is_overdue"]:
            overdue_count += 1
            if not _has_recent_notification(db, case.id, "OVERDUE_CASE_ALERT", today):
                msg = (
                    f"Overdue Grievance Alert: Case {case.id} against '{inst_name}' is "
                    f"{tl['days_overdue']} day(s) past expected disposal date ({tl['due_date'].isoformat()}). "
                    f"Assigned Bureau: {case.assigned_bureau}. Immediate hearing or disposal directive required."
                )
                notif = models.Notification(
                    recipient=officer_or_lead,
                    related_case_id=case.id,
                    notification_type="OVERDUE_CASE_ALERT",
                    message=msg,
                    read_status=False,
                )
                db.add(notif)
                new_notifications_count += 1

        # 3. Escalation Notification (Overdue >= escalation threshold or Critical priority)
        if tl["is_escalated"]:
            escalated_count += 1
            if not _has_recent_notification(db, case.id, "ESCALATION_NOTIFICATION", today):
                msg = (
                    f"Administrative Escalation: Case {case.id} ({case.assigned_bureau}) is severely overdue by "
                    f"{tl['days_overdue']} days (threshold: {config['overdue_escalation_days']} days). "
                    f"Escalated to AICTE Chief Vigilance & Executive Oversight Bench."
                )
                notif = models.Notification(
                    recipient="AICTE HQ Executive Oversight",
                    related_case_id=case.id,
                    notification_type="ESCALATION_NOTIFICATION",
                    message=msg,
                    read_status=False,
                )
                db.add(notif)
                new_notifications_count += 1

        # 4. Pending Case Reminder
        if tl["is_pending_reminder_due"]:
            pending_reminders_count += 1
            if not _has_recent_notification(db, case.id, "PENDING_CASE_REMINDER", today):
                msg = (
                    f"Pending Intake Reminder: Case {case.id} against '{inst_name}' has remained in "
                    f"'{case.status}' status for {tl['days_pending']} days without officer assignment. "
                    f"Action required under AICTE Citizen's Charter."
                )
                notif = models.Notification(
                    recipient=f"{case.assigned_bureau} Intake Officer",
                    related_case_id=case.id,
                    notification_type="PENDING_CASE_REMINDER",
                    message=msg,
                    read_status=False,
                )
                db.add(notif)
                new_notifications_count += 1

    if new_notifications_count > 0:
        db.commit()

    return {
        "scanned_cases": len(open_cases),
        "approaching_cases": approaching_count,
        "overdue_cases": overdue_count,
        "escalated_cases": escalated_count,
        "pending_reminders_count": pending_reminders_count,
        "notifications_generated": new_notifications_count,
    }


def get_approaching_deadline_cases(
    db: Session,
    config: Optional[Dict[str, int]] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Retrieve list of cases currently approaching their disposal deadline."""
    if config is None:
        config = CURRENT_CONFIG
    today = date.today()

    open_cases = (
        db.query(models.ComplaintCase)
        .filter(~models.ComplaintCase.status.in_(CLOSED_STATUSES))
        .all()
    )

    approaching = []
    for c in open_cases:
        tl = classify_case_timeline(c, today=today, config=config)
        if tl["is_approaching"]:
            approaching.append({
                "case_id": c.id,
                "institution_name": c.institution.name if c.institution else None,
                "aicte_pid": c.institution.aicte_permanent_id if c.institution else None,
                "bureau": c.assigned_bureau,
                "assigned_officer": c.assigned_officer,
                "category": c.complaint_category,
                "priority": c.priority,
                "status": c.status,
                "received_date": c.received_date,
                "expected_disposal_date": tl["due_date"],
                "days_remaining": tl["days_remaining"],
            })

    # Sort by days_remaining ascending
    approaching.sort(key=lambda x: x["days_remaining"])
    return approaching[:limit]


def get_overdue_cases(
    db: Session,
    config: Optional[Dict[str, int]] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Retrieve list of cases currently overdue beyond their expected disposal date."""
    if config is None:
        config = CURRENT_CONFIG
    today = date.today()

    open_cases = (
        db.query(models.ComplaintCase)
        .filter(~models.ComplaintCase.status.in_(CLOSED_STATUSES))
        .all()
    )

    overdue = []
    for c in open_cases:
        tl = classify_case_timeline(c, today=today, config=config)
        if tl["is_overdue"]:
            overdue.append({
                "case_id": c.id,
                "institution_name": c.institution.name if c.institution else None,
                "aicte_pid": c.institution.aicte_permanent_id if c.institution else None,
                "bureau": c.assigned_bureau,
                "assigned_officer": c.assigned_officer,
                "category": c.complaint_category,
                "priority": c.priority,
                "status": c.status,
                "received_date": c.received_date,
                "expected_disposal_date": tl["due_date"],
                "days_overdue": tl["days_overdue"],
                "is_escalated": tl["is_escalated"],
            })

    # Sort by days_overdue descending
    overdue.sort(key=lambda x: -x["days_overdue"])
    return overdue[:limit]
