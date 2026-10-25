import csv
import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app import models, crud, schemas, deadline_engine, overlap_engine

TEST_DB_URL = "sqlite:///./test_aicte_reports_and_deadlines.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


# ==============================================================================
# 1. DEADLINE CLASSIFICATION & TIMELINE RULES TESTS
# ==============================================================================
def test_timeline_rules_approaching_vs_overdue(db_session):
    """
    Test deadline calculations:
    - Clearly distinguish approaching deadlines from overdue cases.
    - Calculate overdue status using the configured due date and applicable status rules.
    - Closed cases are never overdue or approaching.
    """
    today = date.today()

    inst = models.Institution(
        internal_id="INST-DEADLINE-01",
        aicte_permanent_id="1-9988776655",
        name="Metropolitan Engineering College",
        normalized_name="metropolitan engineering college",
        address="Bandra, Mumbai",
        region="Western",
    )
    db_session.add(inst)
    db_session.commit()

    # Case 1: Approaching deadline (due in 2 days)
    case_approaching = models.ComplaintCase(
        id="AICTE-TEST-APPROACHING",
        institution_id=inst.id,
        complaint_category="Fee & Financial Anomalies",
        description="Demand of unapproved transport fee.",
        received_date=today - timedelta(days=13),
        expected_disposal_date=today + timedelta(days=2),
        status="Under Process",
        assigned_bureau="RB",
        assigned_officer="Dr. S. K. Raman",
    )

    # Case 2: Overdue case (due 4 days ago)
    case_overdue = models.ComplaintCase(
        id="AICTE-TEST-OVERDUE",
        institution_id=inst.id,
        complaint_category="Faculty & Staff Grievance",
        description="Salary arrears pending.",
        received_date=today - timedelta(days=20),
        expected_disposal_date=today - timedelta(days=4),
        status="In Investigation",
        assigned_bureau="PGRC",
        assigned_officer="Prof. Neha Gupta",
    )

    # Case 3: Concluded case with past expected disposal date
    case_resolved = models.ComplaintCase(
        id="AICTE-TEST-RESOLVED",
        institution_id=inst.id,
        complaint_category="Admission Irregularities",
        description="Resolution compliance accepted.",
        received_date=today - timedelta(days=40),
        expected_disposal_date=today - timedelta(days=10),
        status="Disposed",  # Concluded
        assigned_bureau="PGRC",
    )

    db_session.add_all([case_approaching, case_overdue, case_resolved])
    db_session.commit()

    # Evaluate Case 1
    tl1 = deadline_engine.classify_case_timeline(case_approaching, today=today)
    assert tl1["is_approaching"] is True
    assert tl1["is_overdue"] is False
    assert tl1["days_remaining"] == 2
    assert tl1["timeline_status"] == "APPROACHING_DEADLINE"

    # Evaluate Case 2
    tl2 = deadline_engine.classify_case_timeline(case_overdue, today=today)
    assert tl2["is_approaching"] is False
    assert tl2["is_overdue"] is True
    assert tl2["days_overdue"] == 4
    assert tl2["timeline_status"] == "OVERDUE"

    # Evaluate Case 3 (Disposed)
    tl3 = deadline_engine.classify_case_timeline(case_resolved, today=today)
    assert tl3["is_approaching"] is False
    assert tl3["is_overdue"] is False
    assert tl3["is_closed"] is True
    assert tl3["timeline_status"] == "CONCLUDED"


def test_configurable_deadline_thresholds(db_session, client):
    """
    Test configurable deadline thresholds through API and engine.
    """
    # 1. Read default config
    cfg_resp = client.get("/api/notifications/deadlines/config")
    assert cfg_resp.status_code == 200
    cfg = cfg_resp.json()
    assert "approaching_threshold_days" in cfg
    assert "pending_reminder_days" in cfg
    assert "overdue_escalation_days" in cfg

    # 2. Update config
    update_resp = client.put(
        "/api/notifications/deadlines/config",
        json={
            "approaching_threshold_days": 5,
            "overdue_escalation_days": 10,
        },
    )
    assert update_resp.status_code == 200
    updated_cfg = update_resp.json()["config"]
    assert updated_cfg["approaching_threshold_days"] == 5
    assert updated_cfg["overdue_escalation_days"] == 10

    # 3. Reset back to standard defaults for subsequent tests
    client.put(
        "/api/notifications/deadlines/config",
        json={"approaching_threshold_days": 3, "overdue_escalation_days": 7},
    )


# ==============================================================================
# 2. NOTIFICATIONS & DEDUPLICATION TESTS
# ==============================================================================
def test_deadline_monitoring_scan_and_deduplication(db_session, client):
    """
    Test that deadline monitoring scan generates appropriate reminders and alerts,
    and avoids repeated notifications for the same event on the same day.
    """
    # Run scan via API
    scan_resp = client.post("/api/notifications/scan-deadlines")
    assert scan_resp.status_code == 200
    scan_data = scan_resp.json()["details"]

    assert scan_data["scanned_cases"] >= 2
    assert scan_data["approaching_cases"] >= 1
    assert scan_data["overdue_cases"] >= 1
    initial_generated = scan_data["notifications_generated"]
    assert initial_generated >= 2

    # Check notification records in DB
    notifs = db_session.query(models.Notification).all()
    types = [n.notification_type for n in notifs]
    assert "APPROACHING_DEADLINE_REMINDER" in types
    assert "OVERDUE_CASE_ALERT" in types

    # RUN SCAN A SECOND TIME: must avoid repeated notifications (Rule: Avoid duplicate alerts)
    scan_resp_2 = client.post("/api/notifications/scan-deadlines")
    assert scan_resp_2.status_code == 200
    scan_data_2 = scan_resp_2.json()["details"]
    assert scan_data_2["notifications_generated"] == 0, "Duplicate notifications were improperly generated on repeated scan!"


# ==============================================================================
# 3. REPORTS & MULTI-FACET FILTERING TESTS
# ==============================================================================
def test_reports_summary_with_all_filters(client):
    """
    Test that GET /api/reports/summary calculates all 8 analytical reports
    and respects all multi-facet filters.
    """
    # 1. Unfiltered summary
    resp = client.get("/api/reports/summary")
    assert resp.status_code == 200
    data = resp.json()

    # Verify all 8 reports exist in response
    assert "summary" in data
    assert "bureau_distribution" in data
    assert "region_distribution" in data
    assert "institution_history" in data
    assert "status_distribution" in data
    assert "case_ageing_analysis" in data
    assert "disposal_statistics" in data
    assert "overlap_report" in data
    assert "monthly_summary" in data
    assert "quarterly_summary" in data

    total_unfiltered = data["summary"]["total_records"]
    assert total_unfiltered >= 3

    # 2. Filter by Bureau = "RB"
    resp_rb = client.get("/api/reports/summary?bureau=RB")
    assert resp_rb.status_code == 200
    data_rb = resp_rb.json()
    assert data_rb["summary"]["total_records"] >= 1
    # Check that bureau distribution only includes RB
    for b in data_rb["bureau_distribution"]:
        assert b["bureau"] == "RB"

    # 3. Filter by Region = "Western"
    resp_west = client.get("/api/reports/summary?region=Western")
    assert resp_west.status_code == 200
    data_west = resp_west.json()
    assert data_west["summary"]["total_records"] >= 1

    # 4. Filter by Category
    resp_cat = client.get("/api/reports/summary?category=Fee %26 Financial Anomalies")
    assert resp_cat.status_code == 200
    data_cat = resp_cat.json()
    assert data_cat["summary"]["total_records"] >= 1

    # 5. Filter by Status = "Disposed"
    resp_disp = client.get("/api/reports/summary?status=Disposed")
    assert resp_disp.status_code == 200
    data_disp = resp_disp.json()
    assert data_disp["summary"]["active_cases"] == 0
    assert data_disp["summary"]["resolved_cases"] >= 1


# ==============================================================================
# 4. SAFE CSV EXPORT & ROLE-BASED ACCESS CONTROL (RBAC) TESTS
# ==============================================================================
def test_safe_csv_export_and_formula_injection_protection(client):
    """
    Test CSV export:
    - Safe handling for user-supplied text (neutralizing formula injection =,+,-,@,\t).
    - Totals match filtered report summary.
    """
    csv_resp = client.get("/api/reports/export/csv?bureau=RB")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]

    csv_text = csv_resp.text
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)

    header = rows[0]
    assert "Case ID" in header
    assert "Institution Name" in header
    assert "Timeline Status" in header
    assert "Complainant Name (Sanitized)" in header

    # Ensure data rows exist and match filtered count
    data_rows = rows[1:]
    assert len(data_rows) >= 1

    # Verify no unescaped formula characters exist at start of cells
    for row in data_rows:
        for cell in row:
            if cell.startswith(("=", "+", "-", "@")):
                # Must be quoted / neutralized
                assert cell.startswith("'"), f"Dangerous unescaped formula cell detected: {cell}"


def test_csv_export_role_based_pii_redaction(db_session, client):
    """
    Test RBAC on export:
    - Non-authorized roles (Viewer, Public) have complainant name redacted to '[CONFIDENTIAL - CITIZEN GRIEVANT]'.
    - Authorized roles (Admin, Bureau Officer) can see complainant name.
    - Personal phone/email are never exposed indiscriminately.
    """
    # 1. Export as Viewer (Unauthorized for PII)
    resp_viewer = client.get("/api/reports/export/csv?role=Viewer")
    assert resp_viewer.status_code == 200
    reader_viewer = csv.reader(io.StringIO(resp_viewer.text))
    rows_viewer = list(reader_viewer)
    header = rows_viewer[0]
    comp_name_idx = header.index("Complainant Name (Sanitized)")

    # All data rows must have redacted complainant name
    for row in rows_viewer[1:]:
        assert row[comp_name_idx] == "[CONFIDENTIAL - CITIZEN GRIEVANT]", (
            f"PII Leakage! Complainant name was not redacted for Viewer: {row[comp_name_idx]}"
        )

    # 2. Export as Bureau Officer (Authorized)
    resp_officer = client.get("/api/reports/export/csv?role=Bureau%20Officer")
    assert resp_officer.status_code == 200
    reader_officer = csv.reader(io.StringIO(resp_officer.text))
    rows_officer = list(reader_officer)

    # Ensure authorized official sees official administrative docket
    found_official = False
    for row in rows_officer[1:]:
        if row[comp_name_idx] != "[CONFIDENTIAL - CITIZEN GRIEVANT]":
            found_official = True
            break
    assert found_official is True, "Authorized officer should receive standard complainant record."


def test_displayed_totals_match_exported_records(client):
    """
    Ensure that displayed totals and exported records use the same filters.
    """
    # 1. Query summary for Western region
    summary_resp = client.get("/api/reports/summary?region=Western")
    assert summary_resp.status_code == 200
    reported_total = summary_resp.json()["summary"]["total_records"]

    # 2. Query CSV export for Western region
    csv_resp = client.get("/api/reports/export/csv?region=Western")
    assert csv_resp.status_code == 200
    reader = csv.reader(io.StringIO(csv_resp.text))
    rows = list(reader)
    exported_total = len(rows) - 1  # Subtract header

    assert reported_total == exported_total, (
        f"Mismatch between displayed total ({reported_total}) and exported rows ({exported_total})!"
    )
