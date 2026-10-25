import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.seed import seed_database
from app import models

# Use a test SQLite database
TEST_DB_URL = "sqlite:///./test_aicte_complaints.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Create tables and seed data once for test session
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    # Cleanup after test session
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


# ==========================================
# 1. HEALTH CHECK TESTS
# ==========================================

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["database"] == "healthy"
    assert "version" in data


# ==========================================
# 2. USER & AUTH TESTS
# ==========================================

def test_users_list_and_roles(client):
    res = client.get("/api/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 5
    logins = [u["login_identifier"] for u in users]
    assert "admin.central@aicte-india.org" in logins
    assert "dir.pgrc@aicte-india.org" in logins


def test_create_user_and_duplicate_prevention(client):
    new_user = {
        "name": "Prof. R. Ramanujan",
        "login_identifier": "ramanujan@aicte-india.org",
        "password": "SecurePassword123",
        "role": "Bureau Officer",
        "active_status": True,
    }
    res = client.post("/api/users", json=new_user)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == new_user["name"]
    assert created["login_identifier"] == new_user["login_identifier"]

    # Attempt duplicate registration with same login_identifier
    dup_res = client.post("/api/users", json=new_user)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]


def test_user_authentication_and_login_validation(client):
    # Test successful login with created user
    login_payload = {
        "login_identifier": "ramanujan@aicte-india.org",
        "password": "SecurePassword123",
    }
    resp = client.post("/api/users/login", json=login_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Authentication successful."
    assert data["user"]["login_identifier"] == "ramanujan@aicte-india.org"
    assert data["user"]["role"] == "Bureau Officer"
    assert "token" in data

    # Test invalid password rejection (HTTP 401)
    bad_login = {
        "login_identifier": "ramanujan@aicte-india.org",
        "password": "WrongPassword999",
    }
    bad_resp = client.post("/api/users/login", json=bad_login)
    assert bad_resp.status_code == 401
    assert "Invalid login identifier or password" in bad_resp.json()["detail"]

    # Test non-existent user rejection (HTTP 401)
    non_existent = {
        "login_identifier": "nonexistent@aicte-india.org",
        "password": "AnyPassword123",
    }
    non_resp = client.post("/api/users/login", json=non_existent)
    assert non_resp.status_code == 401


# ==========================================
# 3. INSTITUTION CRUD & SEARCH TESTS
# ==========================================

def test_get_institutions_and_search(client):
    # Test listing
    res = client.get("/api/institutions")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 8
    assert len(body["data"]) >= 8

    # Test search by name
    search_res = client.get("/api/institutions?search=Delhi Apex")
    assert search_res.status_code == 200
    data = search_res.json()["data"]
    assert len(data) >= 1
    assert "Delhi Apex Institute" in data[0]["name"]

    # Test search by AICTE PID
    pid_res = client.get("/api/institutions?search=1-43289011")
    assert pid_res.status_code == 200
    assert len(pid_res.json()["data"]) >= 1
    assert pid_res.json()["data"][0]["aicte_permanent_id"] == "1-43289011"

    # Test filter by region
    reg_res = client.get("/api/institutions?region=Western")
    assert reg_res.status_code == 200
    for inst in reg_res.json()["data"]:
        assert inst["region"] == "Western"


def test_create_institution_and_validation(client):
    new_inst = {
        "name": "Ahmedabad Institute of Technology & Research",
        "aicte_permanent_id": "1-99887766",
        "region": "Western",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "address": "SG Highway, Gota, Ahmedabad 382481",
        "institution_type": "Private-Self Financing",
        "established_year": 2010,
    }
    res = client.post("/api/institutions", json=new_inst)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == new_inst["name"]
    assert created["internal_id"].startswith("AICTE-INST-")

    # Reject duplicate PID
    dup_res = client.post("/api/institutions", json=new_inst)
    assert dup_res.status_code == 400
    assert "already registered" in dup_res.json()["detail"]

    # Reject invalid short name (<3 chars)
    invalid_inst = dict(new_inst)
    invalid_inst["name"] = "AB"
    invalid_inst["aicte_permanent_id"] = "1-11223344"
    inv_res = client.post("/api/institutions", json=invalid_inst)
    assert inv_res.status_code == 422


def test_institution_detail_and_complaint_history(client):
    # Fetch first institution
    list_res = client.get("/api/institutions")
    inst_id = list_res.json()["data"][0]["id"]

    res = client.get(f"/api/institutions/{inst_id}")
    assert res.status_code == 200
    assert res.json()["id"] == inst_id

    # Fetch institution complaint history
    hist_res = client.get(f"/api/institutions/{inst_id}/complaints")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert "institution" in hist
    assert "complaints" in hist
    assert isinstance(hist["complaints"], list)


# ==========================================
# 4. COMPLAINT CRUD & FILTERING TESTS
# ==========================================

def test_create_complaint_and_audit_init(client):
    # Use existing institution
    inst_res = client.get("/api/institutions")
    inst_id = inst_res.json()["data"][0]["id"]

    new_case = {
        "institution_id": inst_id,
        "complaint_category": "Ragging & Student Harassment",
        "description": "Severe ragging reported in hostel Block C during night hours by senior batch.",
        "priority": "Critical",
        "assigned_bureau": "PGRC",
        "assigned_officer": "Dr. V. K. Sharma",
        "acting_user": "Central Helpdesk Desk-4",
        "custom_case_id": "AICTE-2026-TEST-9001",
    }
    res = client.post("/api/complaints", json=new_case)
    assert res.status_code == 201
    created = res.json()
    assert created["id"] == "AICTE-2026-TEST-9001"
    assert created["priority"] == "Critical"
    assert created["assigned_bureau"] == "PGRC"

    # Verify initial CaseAction was recorded
    assert len(created["actions"]) >= 1
    assert created["actions"][0]["action_type"] == "Case Docketed"
    assert created["actions"][0]["acting_user"] == "Central Helpdesk Desk-4"


def test_create_complaint_foreign_key_validation(client):
    # Try invalid institution ID
    invalid_case = {
        "institution_id": 999999,
        "complaint_category": "Non-Refund of Fees / Security Deposit",
        "description": "Institute refused to refund admission fees within 15 days.",
    }
    res = client.post("/api/complaints", json=invalid_case)
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"]


def test_create_complaint_pydantic_validation(client):
    # Description shorter than min_length=10
    short_case = {
        "institution_id": 1,
        "complaint_category": "Capitation Fee",
        "description": "Too short",
    }
    res = client.post("/api/complaints", json=short_case)
    assert res.status_code == 422


def test_complaint_multi_facet_filtering(client):
    # Filter by bureau
    pgrc_res = client.get("/api/complaints?bureau=PGRC")
    assert pgrc_res.status_code == 200
    for c in pgrc_res.json()["data"]:
        assert c["assigned_bureau"] == "PGRC"

    # Filter by status
    status_res = client.get("/api/complaints?status=Hearing Scheduled")
    assert status_res.status_code == 200
    for c in status_res.json()["data"]:
        assert c["status"] == "Hearing Scheduled"

    # Filter by priority
    crit_res = client.get("/api/complaints?priority=Critical")
    assert crit_res.status_code == 200
    for c in crit_res.json()["data"]:
        assert c["priority"] == "Critical"

    # Search query
    search_res = client.get("/api/complaints?search=marksheets")
    assert search_res.status_code == 200
    assert len(search_res.json()["data"]) >= 1


# ==========================================
# 5. CASE ACTIONS, WORKFLOW & AUDIT TRAIL TESTS
# ==========================================

def test_case_assignment_creates_audit_action(client):
    case_id = "AICTE-2026-TEST-9001"
    assign_payload = {
        "assigned_bureau": "RB",
        "assigned_officer": "Prof. Sunita Rao",
        "remarks": "Transferred for statutory inquiry under Regulation Bureau.",
        "acting_user": "Director AICTE",
    }
    res = client.post(f"/api/complaints/{case_id}/assign", json=assign_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["assigned_bureau"] == "RB"
    assert data["assigned_officer"] == "Prof. Sunita Rao"

    # Check action history
    actions_res = client.get(f"/api/complaints/{case_id}/actions")
    assert actions_res.status_code == 200
    actions = actions_res.json()
    action_types = [a["action_type"] for a in actions]
    assert "Reassignment" in action_types
    latest = actions[0]
    assert latest["acting_user"] == "Director AICTE"
    assert latest["new_value"] == "RB (Prof. Sunita Rao)"


def test_case_status_update_creates_audit_action(client):
    case_id = "AICTE-2026-TEST-9001"
    status_payload = {
        "status": "In Investigation",
        "remarks": "Inquiry committee convened and evidence accepted.",
        "acting_user": "Prof. Sunita Rao",
    }
    res = client.post(f"/api/complaints/{case_id}/status", json=status_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "In Investigation"

    # Verify audit action
    actions = client.get(f"/api/complaints/{case_id}/actions").json()
    assert actions[0]["action_type"] == "Status Update"
    assert actions[0]["new_value"] == "In Investigation"


def test_case_transfer_and_escalation(client):
    case_id = "AICTE-2026-TEST-9001"

    # Test Escalation
    esc_payload = {
        "escalate_to": "Chairman AICTE",
        "reason": "Institutional non-cooperation with inquiry notice.",
        "acting_user": "Prof. Sunita Rao",
    }
    esc_res = client.post(f"/api/complaints/{case_id}/escalate", json=esc_payload)
    assert esc_res.status_code == 200
    assert esc_res.json()["priority"] == "Critical"

    # Test Transfer
    trans_payload = {
        "transfer_to": "State Higher Education Directorate",
        "reason": "Direct jurisdictional authority over state university hostel.",
        "acting_user": "Prof. Sunita Rao",
    }
    trans_res = client.post(f"/api/complaints/{case_id}/transfer", json=trans_payload)
    assert trans_res.status_code == 200
    assert trans_res.json()["status"] == "Transferred"


def test_global_actions_audit_history(client):
    res = client.get("/api/actions?limit=20")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 5
    assert len(body["data"]) >= 5
    for a in body["data"]:
        assert "case_id" in a
        assert "action_type" in a
        assert "acting_user" in a
        assert "timestamp" in a


# ==========================================
# 6. OVERLAPS & CASE RELATIONSHIPS TESTS
# ==========================================

def test_overlaps_list_and_review(client):
    # List seeded overlaps
    res = client.get("/api/overlaps")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    overlap = body["data"][0]
    overlap_id = overlap["id"]
    assert overlap["review_status"] == "Pending Review"

    # Review overlap
    review_payload = {
        "review_status": "Joint Hearing Constituted",
        "reviewed_by": "Dr. Anil Sahasrabudhe",
        "review_remarks": "Constituted Joint Bench with Regulation Bureau & PGRC leads.",
    }
    rev_res = client.post(f"/api/overlaps/{overlap_id}/review", json=review_payload)
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["review_status"] == "Joint Hearing Constituted"
    assert rev_data["reviewed_by"] == "Dr. Anil Sahasrabudhe"


def test_manual_overlap_linking_and_validation(client):
    # Link two seeded complaints
    link_payload = {
        "first_case_id": "AICTE-2026-C-0799",
        "second_case_id": "AICTE-2026-C-0765",
        "relationship_type": "Institutional History Pattern",
        "matching_reason": "Repeated non-compliance with faculty cadre and facility norms.",
    }
    res = client.post("/api/overlaps", json=link_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["first_case_id"] == "AICTE-2026-C-0799"
    assert created["second_case_id"] == "AICTE-2026-C-0765"

    # Reject duplicate link
    dup_res = client.post("/api/overlaps", json=link_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # Reject self-link
    self_link = dict(link_payload)
    self_link["second_case_id"] = "AICTE-2026-C-0799"
    self_res = client.post("/api/overlaps", json=self_link)
    assert self_res.status_code == 400


# ==========================================
# 7. NOTIFICATIONS TESTS
# ==========================================

def test_notifications_crud_and_mark_read(client):
    # List notifications
    res = client.get("/api/notifications")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 4
    notif_id = body["data"][0]["id"]

    # Mark as read
    read_res = client.post(f"/api/notifications/{notif_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["read_status"] == True

    # Mark all read
    mark_all = client.post("/api/notifications/mark-all-read")
    assert mark_all.status_code == 200
    assert "Marked" in mark_all.json()["message"]


# ==========================================
# 8. DASHBOARD STATISTICS TESTS (SQL AGGREGATION)
# ==========================================

def test_dashboard_statistics(client):
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_cases"] >= 7
    assert stats["total_institutions"] >= 8
    assert "pending_cases" in stats
    assert "under_process_cases" in stats
    assert "disposed_cases" in stats
    assert "transferred_cases" in stats
    assert "overdue_cases" in stats
    assert "unresolved_overlaps" in stats
    assert "resolution_rate" in stats


def test_bureau_workload_and_distributions(client):
    # Bureau workload
    b_res = client.get("/api/dashboard/bureau-workload")
    assert b_res.status_code == 200
    bureaus = b_res.json()
    assert len(bureaus) == 6
    b_codes = [b["code"] for b in bureaus]
    assert "PGRC" in b_codes
    assert "RB" in b_codes

    # Region distribution
    r_res = client.get("/api/dashboard/region-distribution")
    assert r_res.status_code == 200
    regions = r_res.json()
    assert len(regions) >= 7

    # Status distribution
    s_res = client.get("/api/dashboard/status-distribution")
    assert s_res.status_code == 200
    assert len(s_res.json()) >= 5


# ==========================================
# 9. REPORTS & CSV EXPORT TESTS
# ==========================================

def test_reports_summary(client):
    res = client.get("/api/reports/summary")
    assert res.status_code == 200
    rep = res.json()
    assert rep["total_records"] >= 7
    assert "active_cases" in rep
    assert "resolved_cases" in rep
    assert "category_breakdown" in rep


def test_csv_export(client):
    res = client.get("/api/reports/export/csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in res.headers["content-disposition"]

    csv_text = res.text
    lines = csv_text.strip().split("\r\n")
    if len(lines) == 1:
        lines = csv_text.strip().split("\n")

    # Header check
    headers = lines[0].split(",")
    assert "Case ID" in headers[0]
    assert "Institution Name" in headers[1]
    assert len(lines) >= 8  # Header + at least 7 seeded/test cases


# ==========================================
# 10. DATABASE PERSISTENCE ACROSS SESSIONS
# ==========================================

def test_database_persistence_across_sessions():
    """Verify that records written in one database session persist in a new, independent session."""
    session1 = TestingSessionLocal()
    unique_pid = "1-PERSIST-999"
    inst = models.Institution(
        internal_id="AICTE-INST-PERSIST",
        aicte_permanent_id=unique_pid,
        name="Persistence Verification Institute",
        normalized_name="persistence verification institute",
        region="Southern",
    )
    session1.add(inst)
    session1.commit()
    inst_id = inst.id
    session1.close()

    # Open completely new session from engine
    session2 = TestingSessionLocal()
    retrieved = session2.query(models.Institution).filter(models.Institution.id == inst_id).first()
    assert retrieved is not None
    assert retrieved.aicte_permanent_id == unique_pid
    assert retrieved.name == "Persistence Verification Institute"

    # Cleanup persistence test record
    session2.delete(retrieved)
    session2.commit()
    session2.close()
