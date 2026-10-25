import csv
import io
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app import crud, models, deadline_engine

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

AUTHORIZED_ROLES = [
    "Admin",
    "Bureau Officer",
    "Bureau Lead",
    "Chairman",
    "Member Secretary",
    "Director",
    "Central Administrator",
]


def sanitize_csv_field(val: Any) -> str:
    """
    Safe CSV handling for user-supplied text.
    Prevents CSV Formula Injection (=, +, -, @, tab, carriage return).
    Escapes characters properly for spreadsheets.
    """
    if val is None:
        return ""
    text = str(val)
    # Neutralize formula execution in Excel/Calc
    if text.startswith(("=", "+", "-", "@", "\t", "\r")):
        text = "'" + text
    return text


@router.get("/summary")
def get_reports_summary(
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    bureau: Optional[str] = Query("ALL", description="Filter by Bureau"),
    region: Optional[str] = Query("ALL", description="Filter by Region"),
    institution_id: Optional[int] = Query(None, description="Filter by Institution ID"),
    institution_name: Optional[str] = Query(None, description="Filter by Institution Name"),
    status: Optional[str] = Query("ALL", description="Filter by Status"),
    category: Optional[str] = Query("ALL", description="Filter by Category"),
    overlap_status: Optional[str] = Query("ALL", description="Filter by Overlap review status"),
    db: Session = Depends(get_db),
):
    """
    Aggregate comprehensive compliance and monitoring reports across filtered dataset:
    - Bureau-wise case distribution
    - Region-wise case distribution
    - Institution-wise complaint history
    - Status-wise case counts
    - Case ageing analysis
    - Disposal statistics
    - Overlap and duplicate-suggestion reports
    - Monthly and quarterly summaries
    """
    cases, total = crud.get_complaints(
        db,
        institution_id=institution_id,
        institution_name=institution_name,
        bureau=bureau,
        region=region,
        category=category,
        status=status,
        date_from=date_from,
        date_to=date_to,
        overlap_status=overlap_status,
        limit=5000,
    )

    today = date.today()

    resolved_count = 0
    overdue_count = 0
    transferred_count = 0
    disposal_days_list = []

    bureau_map: Dict[str, Dict[str, int]] = {}
    region_map: Dict[str, Dict[str, int]] = {}
    inst_map: Dict[int, Dict[str, Any]] = {}
    status_map: Dict[str, int] = {}
    category_map: Dict[str, int] = {}
    monthly_map: Dict[str, Dict[str, int]] = {}
    quarterly_map: Dict[str, Dict[str, int]] = {}

    ageing_buckets = {
        "0-7 Days": 0,
        "8-15 Days": 0,
        "16-30 Days": 0,
        "31-60 Days": 0,
        ">60 Days": 0,
    }

    for c in cases:
        tl = deadline_engine.classify_case_timeline(c, today=today)
        inst = c.institution

        # Core status counts
        if tl["is_closed"]:
            if c.status == "Transferred":
                transferred_count += 1
            else:
                resolved_count += 1
                # Calculate disposal duration
                if c.received_date:
                    days_to_dispose = max(0, (today - c.received_date).days)
                    disposal_days_list.append(days_to_dispose)
        else:
            ageing_buckets[tl["ageing_bucket"]] = ageing_buckets.get(tl["ageing_bucket"], 0) + 1
            if tl["is_overdue"]:
                overdue_count += 1

        # Status distribution
        st = c.status
        status_map[st] = status_map.get(st, 0) + 1

        # Category distribution
        cat = c.complaint_category
        category_map[cat] = category_map.get(cat, 0) + 1

        # Bureau distribution
        b = c.assigned_bureau or "Unassigned"
        if b not in bureau_map:
            bureau_map[b] = {"total": 0, "active": 0, "resolved": 0, "overdue": 0}
        bureau_map[b]["total"] += 1
        if tl["is_closed"]:
            bureau_map[b]["resolved"] += 1
        else:
            bureau_map[b]["active"] += 1
            if tl["is_overdue"]:
                bureau_map[b]["overdue"] += 1

        # Region distribution
        reg = (inst.region if inst else "Unknown") or "Unknown"
        if reg not in region_map:
            region_map[reg] = {"total": 0, "active": 0, "resolved": 0, "overdue": 0}
        region_map[reg]["total"] += 1
        if tl["is_closed"]:
            region_map[reg]["resolved"] += 1
        else:
            region_map[reg]["active"] += 1
            if tl["is_overdue"]:
                region_map[reg]["overdue"] += 1

        # Institution-wise history
        if inst:
            if inst.id not in inst_map:
                inst_map[inst.id] = {
                    "institution_id": inst.id,
                    "institution_name": inst.name,
                    "aicte_permanent_id": inst.aicte_permanent_id,
                    "internal_id": inst.internal_id,
                    "region": inst.region,
                    "total_cases": 0,
                    "open_cases": 0,
                    "resolved_cases": 0,
                    "overdue_cases": 0,
                }
            inst_map[inst.id]["total_cases"] += 1
            if tl["is_closed"]:
                inst_map[inst.id]["resolved_cases"] += 1
            else:
                inst_map[inst.id]["open_cases"] += 1
                if tl["is_overdue"]:
                    inst_map[inst.id]["overdue_cases"] += 1

        # Monthly & Quarterly time grouping
        if c.received_date:
            m_key = c.received_date.strftime("%Y-%m")
            q_num = (c.received_date.month - 1) // 3 + 1
            q_key = f"{c.received_date.year}-Q{q_num}"

            if m_key not in monthly_map:
                monthly_map[m_key] = {"received": 0, "resolved": 0}
            monthly_map[m_key]["received"] += 1
            if tl["is_closed"]:
                monthly_map[m_key]["resolved"] += 1

            if q_key not in quarterly_map:
                quarterly_map[q_key] = {"received": 0, "resolved": 0}
            quarterly_map[q_key]["received"] += 1
            if tl["is_closed"]:
                quarterly_map[q_key]["resolved"] += 1

    active_cases = total - (resolved_count + transferred_count)
    resolution_rate = round((resolved_count / total * 100), 1) if total > 0 else 0.0
    avg_disposal_days = round(sum(disposal_days_list) / len(disposal_days_list), 1) if disposal_days_list else 0.0

    # Overlap and duplicate-suggestion reports
    rel_query = db.query(models.CaseRelationship)
    total_relationships = rel_query.count()
    all_rels = rel_query.all()

    overlap_review_counts: Dict[str, int] = {}
    overlap_type_counts: Dict[str, int] = {}
    for r in all_rels:
        st = r.review_status or "Pending Review"
        overlap_review_counts[st] = overlap_review_counts.get(st, 0) + 1
        t = r.relationship_type or "Cross-Bureau Overlap"
        overlap_type_counts[t] = overlap_type_counts.get(t, 0) + 1

    return {
        "total_records": total,
        "active_cases": active_cases,
        "resolved_cases": resolved_count,
        "overdue_cases": overdue_count,
        "transferred_cases": transferred_count,
        "resolution_rate": resolution_rate,
        "avg_days_to_disposal": avg_disposal_days,
        "summary": {
            "total_records": total,
            "active_cases": active_cases,
            "resolved_cases": resolved_count,
            "overdue_cases": overdue_count,
            "transferred_cases": transferred_count,
            "resolution_rate": resolution_rate,
            "avg_days_to_disposal": avg_disposal_days,
        },
        "bureau_distribution": [
            {"bureau": k, **v} for k, v in sorted(bureau_map.items(), key=lambda x: -x[1]["total"])
        ],
        "region_distribution": [
            {"region": k, **v} for k, v in sorted(region_map.items(), key=lambda x: -x[1]["total"])
        ],
        "institution_history": sorted(
            list(inst_map.values()), key=lambda x: -x["total_cases"]
        )[:25],
        "status_distribution": [
            {"status": k, "count": v} for k, v in sorted(status_map.items(), key=lambda x: -x[1])
        ],
        "category_breakdown": [
            {"category": k, "count": v} for k, v in sorted(category_map.items(), key=lambda x: -x[1])
        ],
        "case_ageing_analysis": [
            {
                "bucket": k,
                "count": v,
                "percentage": round(v / active_cases * 100, 1) if active_cases > 0 else 0.0,
            }
            for k, v in ageing_buckets.items()
        ],
        "disposal_statistics": {
            "total_disposed": resolved_count,
            "average_days_to_disposal": avg_disposal_days,
            "resolution_rate": resolution_rate,
            "by_bureau": [
                {"bureau": k, "resolved": v["resolved"], "rate": round(v["resolved"] / v["total"] * 100, 1) if v["total"] > 0 else 0.0}
                for k, v in bureau_map.items()
            ],
        },
        "overlap_report": {
            "total_relationships": total_relationships,
            "by_review_status": overlap_review_counts,
            "by_relationship_type": overlap_type_counts,
        },
        "monthly_summary": [
            {"period": k, **v} for k, v in sorted(monthly_map.items())
        ],
        "quarterly_summary": [
            {"period": k, **v} for k, v in sorted(quarterly_map.items())
        ],
    }


@router.get("/export/csv")
def export_complaints_csv(
    search: Optional[str] = Query(None),
    bureau: Optional[str] = Query("ALL"),
    region: Optional[str] = Query("ALL"),
    institution_id: Optional[int] = Query(None),
    institution_name: Optional[str] = Query(None),
    status: Optional[str] = Query("ALL"),
    priority: Optional[str] = Query("ALL"),
    category: Optional[str] = Query("ALL"),
    overlap_status: Optional[str] = Query("ALL"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    role: Optional[str] = Query("Bureau Officer", description="Requesting official role for RBAC"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    """
    Generate and stream a validated CSV export of complaint cases.
    - Same filters as reports and dashboard for consistent totals.
    - Safe CSV handling against CSV formula injection.
    - Role-based redaction of confidential complainant PII.
    """
    user_role = x_user_role or role or "Bureau Officer"
    is_authorized = user_role in AUTHORIZED_ROLES

    cases, _ = crud.get_complaints(
        db,
        search=search,
        bureau=bureau,
        region=region,
        institution_id=institution_id,
        institution_name=institution_name,
        status=status,
        priority=priority,
        category=category,
        overlap_status=overlap_status,
        date_from=date_from,
        date_to=date_to,
        limit=5000,
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Case ID",
        "Institution Name",
        "AICTE PID",
        "Internal ID",
        "Region",
        "Category",
        "Status",
        "Priority",
        "Assigned Bureau",
        "Assigned Officer",
        "Received Date",
        "Expected Disposal Date",
        "Timeline Status",
        "Days Pending",
        "Days Overdue",
        "Ageing Bucket",
        "Has Overlap Alert",
        "Complainant Type",
        "Complainant Name (Sanitized)",
        "Description",
        "Last Action",
        "Next Action",
    ])

    today = date.today()

    for c in cases:
        tl = deadline_engine.classify_case_timeline(c, today=today)
        inst = c.institution

        # Role-based PII redaction
        if is_authorized:
            comp_name = c.complainant_name or "Anonymous"
        else:
            comp_name = "[CONFIDENTIAL - CITIZEN GRIEVANT]"

        has_overlap = "YES" if (len(c.primary_relationships) > 0 or len(c.secondary_relationships) > 0) else "NO"
        desc_clean = (c.description or "").replace("\n", " ").replace("\r", " ")

        writer.writerow([
            sanitize_csv_field(c.id),
            sanitize_csv_field(inst.name if inst else ""),
            sanitize_csv_field(inst.aicte_permanent_id if inst else "Unverified"),
            sanitize_csv_field(inst.internal_id if inst else ""),
            sanitize_csv_field(inst.region if inst else ""),
            sanitize_csv_field(c.complaint_category),
            sanitize_csv_field(c.status),
            sanitize_csv_field(c.priority),
            sanitize_csv_field(c.assigned_bureau),
            sanitize_csv_field(c.assigned_officer or "Unassigned"),
            sanitize_csv_field(c.received_date.isoformat() if c.received_date else ""),
            sanitize_csv_field(tl["due_date"].isoformat() if tl["due_date"] else ""),
            sanitize_csv_field(tl["timeline_status"]),
            sanitize_csv_field(tl["days_pending"]),
            sanitize_csv_field(tl["days_overdue"]),
            sanitize_csv_field(tl["ageing_bucket"]),
            sanitize_csv_field(has_overlap),
            sanitize_csv_field(c.complainant_type or "Citizen"),
            sanitize_csv_field(comp_name),
            sanitize_csv_field(desc_clean),
            sanitize_csv_field(c.last_action or ""),
            sanitize_csv_field(c.next_action or ""),
        ])

    csv_data = output.getvalue()
    output.close()

    filename = f"aicte_complaints_export_{today.isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
