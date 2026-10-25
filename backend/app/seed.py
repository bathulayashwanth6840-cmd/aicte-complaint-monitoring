import hashlib
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, crud


def hash_pw(pwd: str) -> str:
    return hashlib.sha256(pwd.encode("utf-8")).hexdigest()


def seed_database(db: Session) -> None:
    """Idempotently seed demonstration users, institutions, complaints, actions, overlaps, and notifications."""

    # -------------------------------------------------------------
    # 1. SEED USERS
    # -------------------------------------------------------------
    users_data = [
        {
            "name": "Dr. Anil Sahasrabudhe",
            "login_identifier": "admin.central@aicte-india.org",
            "password_hash": hash_pw("Admin@AICTE2026"),
            "role": "Central Administrator",
            "active_status": True,
        },
        {
            "name": "Dr. V. K. Sharma",
            "login_identifier": "dir.pgrc@aicte-india.org",
            "password_hash": hash_pw("Pgrc@AICTE2026"),
            "role": "Bureau Officer",
            "active_status": True,
        },
        {
            "name": "Prof. Sunita Rao",
            "login_identifier": "advisor.rb@aicte-india.org",
            "password_hash": hash_pw("Rb@AICTE2026"),
            "role": "Bureau Officer",
            "active_status": True,
        },
        {
            "name": "Dr. M. K. Narayanan",
            "login_identifier": "ro.approval@aicte-india.org",
            "password_hash": hash_pw("Ab@AICTE2026"),
            "role": "Regional Officer",
            "active_status": True,
        },
        {
            "name": "Dr. Sanjay Deshmukh",
            "login_identifier": "registrar@niet-pune.ac.in",
            "password_hash": hash_pw("Niet@AICTE2026"),
            "role": "Institution Nodal Officer",
            "active_status": True,
        },
    ]

    for u in users_data:
        existing = db.query(models.User).filter(models.User.login_identifier == u["login_identifier"]).first()
        if not existing:
            db.add(models.User(**u))
    db.commit()

    # -------------------------------------------------------------
    # 2. SEED INSTITUTIONS
    # -------------------------------------------------------------
    institutions_data = [
        {
            "internal_id": "AICTE-INST-001",
            "aicte_permanent_id": "1-43289011",
            "name": "National Institute of Engineering & Technology",
            "normalized_name": crud.normalize_text("National Institute of Engineering & Technology"),
            "region": "Western",
            "state": "Maharashtra",
            "district": "Pune",
            "address": "Survey No. 44/1, Hinjawadi Phase-1, IT Park Road, Pune, Maharashtra 411057",
            "institution_type": "Private-Self Financing",
            "established_year": 2004,
        },
        {
            "internal_id": "AICTE-INST-002",
            "aicte_permanent_id": "1-33419082",
            "name": "Delhi Apex Institute of Management & Science",
            "normalized_name": crud.normalize_text("Delhi Apex Institute of Management & Science"),
            "region": "North Western",
            "state": "Delhi",
            "district": "South West Delhi",
            "address": "Institutional Area, Sector-9, Dwarka, New Delhi 110077",
            "institution_type": "Private-Aided",
            "established_year": 1998,
        },
        {
            "internal_id": "AICTE-INST-003",
            "aicte_permanent_id": "1-78902145",
            "name": "Bengaluru Tech & Science University Campus",
            "normalized_name": crud.normalize_text("Bengaluru Tech & Science University Campus"),
            "region": "South Western",
            "state": "Karnataka",
            "district": "Bengaluru Urban",
            "address": "Outer Ring Road, Marathahalli Sub-division, Bengaluru 560103",
            "institution_type": "Deemed-to-be-University",
            "established_year": 2011,
        },
        {
            "internal_id": "AICTE-INST-004",
            "aicte_permanent_id": "1-55428901",
            "name": "Hyderabad Institute of Pharmaceutical Sciences",
            "normalized_name": crud.normalize_text("Hyderabad Institute of Pharmaceutical Sciences"),
            "region": "South Central",
            "state": "Telangana",
            "district": "Hyderabad",
            "address": "Gachibowli Financial District, Nanakramguda, Hyderabad 500032",
            "institution_type": "Private-Self Financing",
            "established_year": 2007,
        },
        {
            "internal_id": "AICTE-INST-005",
            "aicte_permanent_id": "1-66712390",
            "name": "Kolkata Metropolitan Polytechnic College",
            "normalized_name": crud.normalize_text("Kolkata Metropolitan Polytechnic College"),
            "region": "Eastern",
            "state": "West Bengal",
            "district": "Kolkata",
            "address": "Salt Lake Sector-V, Bidhan Nagar, Kolkata, West Bengal 700091",
            "institution_type": "Government Aided",
            "established_year": 1989,
        },
        {
            "internal_id": "AICTE-INST-006",
            "aicte_permanent_id": "1-22904812",
            "name": "Jaipur Modern School of Architecture & Town Planning",
            "normalized_name": crud.normalize_text("Jaipur Modern School of Architecture & Town Planning"),
            "region": "North Western",
            "state": "Rajasthan",
            "district": "Jaipur",
            "address": "Sitapura Industrial Area, Tonk Road, Jaipur, Rajasthan 302022",
            "institution_type": "Private-Self Financing",
            "established_year": 2014,
        },
        {
            "internal_id": "AICTE-INST-007",
            "aicte_permanent_id": "1-11849033",
            "name": "Chennai Premier Institute of Technology",
            "normalized_name": crud.normalize_text("Chennai Premier Institute of Technology"),
            "region": "Southern",
            "state": "Tamil Nadu",
            "district": "Chennai",
            "address": "Old Mahabalipuram Road (IT Corridor), Sholinganallur, Chennai 600119",
            "institution_type": "Private-Autonomous",
            "established_year": 2001,
        },
        {
            "internal_id": "AICTE-INST-008",
            "aicte_permanent_id": "1-91284733",
            "name": "Bhopal Central Institute of Technology & Management",
            "normalized_name": crud.normalize_text("Bhopal Central Institute of Technology & Management"),
            "region": "Central",
            "state": "Madhya Pradesh",
            "district": "Bhopal",
            "address": "Airport Bypass Road, Gandhi Nagar, Bhopal, Madhya Pradesh 462036",
            "institution_type": "Private-Self Financing",
            "established_year": 2006,
        },
    ]

    for inst in institutions_data:
        existing = db.query(models.Institution).filter(models.Institution.internal_id == inst["internal_id"]).first()
        if not existing:
            db.add(models.Institution(**inst))
    db.commit()

    # Query institution map by internal_id
    inst_map = {i.internal_id: i.id for i in db.query(models.Institution).all()}

    # -------------------------------------------------------------
    # 3. SEED COMPLAINT CASES
    # -------------------------------------------------------------
    today = date.today()
    complaints_data = [
        {
            "id": "AICTE-2026-C-0841",
            "institution_id": inst_map.get("AICTE-INST-002", 1),
            "complaint_category": "Capitation Fee / Irregular Fee Demand",
            "description": "College administration demanded Rs 1,50,000 in unapproved campus development fees in cash prior to handing over original 10th and 12th marksheets, violating AICTE Approval Process Handbook (APH) regulations.",
            "received_date": today - timedelta(days=13),
            "status": "Hearing Scheduled",
            "priority": "Critical",
            "assigned_bureau": "RB",
            "assigned_officer": "Prof. Sunita Rao",
            "last_action": "Scheduled hybrid hearing on 28-Oct-2026 11:00 AM via National VC Network with Management.",
            "next_action": "Conduct hybrid hearing via National VC Network; verify fee receipts produced by complainant.",
            "expected_disposal_date": today + timedelta(days=2),
            "complainant_name": "Sunil Malhotra",
            "complainant_type": "Parent / Guardian",
            "complainant_contact": "sunil.malhotra@gmail.com",
        },
        {
            "id": "AICTE-2026-C-0812",
            "institution_id": inst_map.get("AICTE-INST-002", 1),
            "complaint_category": "Non-Refund of Fees / Security Deposit",
            "description": "Student withdrew admission within the prescribed AICTE cutoff schedule; institute deducted 60% of total paid tuition fee despite mandatory refund guidelines.",
            "received_date": today - timedelta(days=32),
            "status": "In Investigation",
            "priority": "High",
            "assigned_bureau": "PGRC",
            "assigned_officer": "Dr. V. K. Sharma",
            "last_action": "Formal inquiry notice dispatched to Registrar directing release of refund.",
            "next_action": "Cross-reference with Regulation Bureau hearing notes under Clause 8(c).",
            "expected_disposal_date": today - timedelta(days=15),
            "complainant_name": "Rohit Verma",
            "complainant_type": "Student",
            "complainant_contact": "rohit.verma99@yahoo.in",
        },
        {
            "id": "AICTE-2026-C-0799",
            "institution_id": inst_map.get("AICTE-INST-001", 1),
            "complaint_category": "Faculty Cadre Deficiency & 7th CPC Salary Delay",
            "description": "Faculty members not paid salaries as per AICTE 7th CPC recommendations for 6 consecutive months; ad-hoc faculty employed without statutory qualifications.",
            "received_date": today - timedelta(days=24),
            "status": "Action Initiated",
            "priority": "High",
            "assigned_bureau": "AB",
            "assigned_officer": "Dr. M. K. Narayanan",
            "last_action": "Expert Visiting Committee (EVC) surprise inspection report finalized.",
            "next_action": "Review EVC physical audit report before Standing Appellate Committee (SAC).",
            "expected_disposal_date": today + timedelta(days=6),
            "complainant_name": "Faculty Welfare Association",
            "complainant_type": "Faculty / Staff",
            "complainant_contact": "fwa.niet@gmail.com",
        },
        {
            "id": "AICTE-2026-C-0820",
            "institution_id": inst_map.get("AICTE-INST-003", 1),
            "complaint_category": "Ragging & Student Harassment",
            "description": "First-year hostel students subjected to severe mental distress and prohibited rituals. Anti-ragging squad failed to file First Information Report (FIR).",
            "received_date": today - timedelta(days=5),
            "status": "In Investigation",
            "priority": "Critical",
            "assigned_bureau": "PGRC",
            "assigned_officer": "Dr. V. K. Sharma",
            "last_action": "Urgent show cause issued with 48h compliance mandate to Vice Chancellor.",
            "next_action": "Await physical anti-ragging compliance affidavit from Vice Chancellor.",
            "expected_disposal_date": today + timedelta(days=5),
            "complainant_name": "Confidential Whistleblower",
            "complainant_type": "Student",
            "complainant_contact": "confidential.student@protonmail.com",
        },
        {
            "id": "AICTE-2026-C-0765",
            "institution_id": inst_map.get("AICTE-INST-005", 1),
            "complaint_category": "Infrastructure, Lab & Library Deficiency",
            "description": "Computer engineering lab equipment outdated; licensed simulation software absent. Fire safety NOC expired in 2024.",
            "received_date": today - timedelta(days=45),
            "status": "Pending",
            "priority": "Medium",
            "assigned_bureau": "AB",
            "assigned_officer": "Dr. M. K. Narayanan",
            "last_action": "Regional office physical inspection scheduled.",
            "next_action": "Deploy regional inspection committee to verify lab equipment and safety certifications.",
            "expected_disposal_date": today - timedelta(days=12),
            "complainant_name": "Student Council Representatives",
            "complainant_type": "Student",
            "complainant_contact": "studentcouncil.kmpc@gmail.com",
        },
        {
            "id": "AICTE-2026-C-0710",
            "institution_id": inst_map.get("AICTE-INST-007", 1),
            "complaint_category": "Non-Refund of Fees / Security Deposit",
            "description": "Refund of Caution Deposit delayed for 14 graduated students exceeding 6 months after convocation.",
            "received_date": today - timedelta(days=58),
            "status": "Resolved",
            "priority": "Low",
            "assigned_bureau": "PGRC",
            "assigned_officer": "Dr. V. K. Sharma",
            "last_action": "Institution submitted RTGS transaction proof of Rs 1,40,000 for all 14 claimants.",
            "next_action": "Case closed with formal closure certificate issued to institution.",
            "expected_disposal_date": today - timedelta(days=20),
            "complainant_name": "Alumni Group Chennai",
            "complainant_type": "Student",
            "complainant_contact": "alumni.cpit@gmail.com",
        },
        {
            "id": "AICTE-2026-C-0688",
            "institution_id": inst_map.get("AICTE-INST-004", 1),
            "complaint_category": "Scholarship Disbursal & Endorsement Delay",
            "description": "Institution withheld National Scholarship Portal (NSP) endorsement for 22 SC/ST students.",
            "received_date": today - timedelta(days=70),
            "status": "Transferred",
            "priority": "High",
            "assigned_bureau": "SC/ST",
            "assigned_officer": "Shri K. Paswan",
            "last_action": "Transferred to State Social Welfare Directorate for direct portal verification.",
            "next_action": "Monitor state portal status update report.",
            "expected_disposal_date": today - timedelta(days=35),
            "complainant_name": "Student Aid Committee",
            "complainant_type": "Student",
            "complainant_contact": "aid.hyderabad@gmail.com",
        },
    ]

    for comp in complaints_data:
        existing = db.query(models.ComplaintCase).filter(models.ComplaintCase.id == comp["id"]).first()
        if not existing:
            db.add(models.ComplaintCase(**comp))
    db.commit()

    # -------------------------------------------------------------
    # 4. SEED CASE ACTIONS AUDIT TRAIL
    # -------------------------------------------------------------
    actions_data = [
        {
            "case_id": "AICTE-2026-C-0841",
            "acting_user": "Central Intake Desk",
            "action_type": "Case Docketed",
            "previous_value": None,
            "new_value": "Assigned",
            "remarks": "Received formal complaint with documentary evidence. Routed to Regulation Bureau under Rule 7.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=13),
        },
        {
            "case_id": "AICTE-2026-C-0841",
            "acting_user": "Prof. Sunita Rao",
            "action_type": "Notice Issued",
            "previous_value": "Assigned",
            "new_value": "In Investigation",
            "remarks": "Official notice dispatched to Registrar directing release of original marksheets within 48 hours.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=9),
        },
        {
            "case_id": "AICTE-2026-C-0841",
            "acting_user": "Prof. Sunita Rao",
            "action_type": "Hearing Scheduled",
            "previous_value": "In Investigation",
            "new_value": "Hearing Scheduled",
            "remarks": "Scheduled hybrid hearing on 28-Oct-2026 11:00 AM via National VC Network with Management.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=1),
        },
        {
            "case_id": "AICTE-2026-C-0812",
            "acting_user": "Dr. V. K. Sharma",
            "action_type": "Case Docketed",
            "previous_value": None,
            "new_value": "Pending",
            "remarks": "Student complaint registered for non-refund of tuition fees.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=32),
        },
        {
            "case_id": "AICTE-2026-C-0812",
            "acting_user": "Dr. Anil Sahasrabudhe",
            "action_type": "SLA Escalation Alert",
            "previous_value": "Normal SLA",
            "new_value": "Overdue SLA",
            "remarks": "Case marked OVERDUE (>30 days). Automated reminder transmitted to Vice Chancellor and Regional Directorate.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=7),
        },
        {
            "case_id": "AICTE-2026-C-0799",
            "acting_user": "Dr. M. K. Narayanan",
            "action_type": "Inspection Report Filed",
            "previous_value": "Assigned",
            "new_value": "Action Initiated",
            "remarks": "Expert Visiting Committee (EVC) physical verification summary uploaded. Verified deficiency in 8 faculty cadres.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=4),
        },
        {
            "case_id": "AICTE-2026-C-0710",
            "acting_user": "Dr. V. K. Sharma",
            "action_type": "Status Update",
            "previous_value": "In Investigation",
            "new_value": "Resolved",
            "remarks": "Institution submitted bank statement proof of full caution deposit refund to all 14 student claimants.",
            "timestamp": datetime.now(timezone.utc) - timedelta(days=5),
        },
    ]

    for act in actions_data:
        existing = (
            db.query(models.CaseAction)
            .filter(
                models.CaseAction.case_id == act["case_id"],
                models.CaseAction.action_type == act["action_type"],
            )
            .first()
        )
        if not existing:
            db.add(models.CaseAction(**act))
    db.commit()

    # -------------------------------------------------------------
    # 5. SEED CASE RELATIONSHIPS / OVERLAPS
    # -------------------------------------------------------------
    relationships_data = [
        {
            "first_case_id": "AICTE-2026-C-0841",
            "second_case_id": "AICTE-2026-C-0812",
            "relationship_type": "Cross-Bureau Overlap",
            "matching_reason": "Dual active inquiries against Delhi Apex Institute (PID: 1-33419082) across Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC)",
            "review_status": "Pending Review",
            "reviewed_by": None,
            "review_timestamp": None,
            "review_remarks": None,
        },
    ]

    for rel in relationships_data:
        existing = (
            db.query(models.CaseRelationship)
            .filter(
                models.CaseRelationship.first_case_id == rel["first_case_id"],
                models.CaseRelationship.second_case_id == rel["second_case_id"],
            )
            .first()
        )
        if not existing:
            db.add(models.CaseRelationship(**rel))
    db.commit()

    # -------------------------------------------------------------
    # 6. SEED NOTIFICATIONS
    # -------------------------------------------------------------
    notifications_data = [
        {
            "recipient": "AICTE Central Triage",
            "related_case_id": "AICTE-2026-C-0841",
            "notification_type": "OVERLAP_ALERT",
            "message": "AICTE-2026-C-0841 has high similarity with an active PGRC complaint for Delhi Apex Institute.",
            "read_status": False,
        },
        {
            "recipient": "Dr. V. K. Sharma",
            "related_case_id": "AICTE-2026-C-0812",
            "notification_type": "SLA_BREACH",
            "message": "Case AICTE-2026-C-0812 is now 17 days past the mandatory 15-day resolution window.",
            "read_status": False,
        },
        {
            "recipient": "Prof. Sunita Rao",
            "related_case_id": "AICTE-2026-C-0841",
            "notification_type": "HEARING_SCHEDULED",
            "message": "Regulation Bureau virtual hearing confirmed for 28-Oct-2026 with Delhi Apex Institute.",
            "read_status": True,
        },
        {
            "recipient": "Dr. Anil Sahasrabudhe",
            "related_case_id": "AICTE-2026-C-0820",
            "notification_type": "CRITICAL_PRIORITY",
            "message": "Urgent ragging complaint docketed for Bengaluru Tech Campus; immediate triage requested.",
            "read_status": False,
        },
    ]

    for notif in notifications_data:
        existing = (
            db.query(models.Notification)
            .filter(
                models.Notification.recipient == notif["recipient"],
                models.Notification.related_case_id == notif["related_case_id"],
                models.Notification.notification_type == notif["notification_type"],
            )
            .first()
        )
        if not existing:
            db.add(models.Notification(**notif))
    db.commit()
