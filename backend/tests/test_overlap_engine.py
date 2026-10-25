import pytest
from datetime import date, datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app import models, crud, schemas, overlap_engine

TEST_DB_URL = "sqlite:///./test_aicte_overlap_scenarios.db"
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
    with TestClient(app) as c:
        yield c


# ==============================================================================
# SCENARIO A: Two open cases for same verified institution in RB & PGRC
# ==============================================================================
def test_scenario_a_cross_bureau_coordination_alert(db_session):
    """
    Scenario A: Two open cases for the same verified institution assigned to RB and PGRC
    should produce a coordination alert when applicable.
    """
    # 1. Create verified institution
    inst = models.Institution(
        internal_id="INST-SCENARIO-A",
        aicte_permanent_id="1-9876543210",
        name="Vellore Apex Technical Institute",
        normalized_name=overlap_engine.normalize_institution_name("Vellore Apex Technical Institute"),
        address="Katpadi Road, Vellore",
        region="Southern",
    )
    db_session.add(inst)
    db_session.commit()
    db_session.refresh(inst)

    # 2. Create Case 1 under RB
    case_rb = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-A-RB",
            institution_id=inst.id,
            complaint_category="Fee & Financial Anomalies",
            description="Exorbitant laboratory and development fees demanded beyond AICTE approved ceiling.",
            assigned_bureau="RB",
            assigned_officer="Dr. S. K. Raman (Director, RB)",
            priority="High",
            acting_user="Admissions Officer",
        ),
    )

    # 3. Create Case 2 under PGRC
    case_pgrc = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-A-PGRC",
            institution_id=inst.id,
            complaint_category="Faculty & Staff Grievance",
            description="Withholding of faculty salaries and non-compliance with 7th CPC allowances.",
            assigned_bureau="PGRC",
            assigned_officer="Prof. Neha Gupta (Member Secretary, PGRC)",
            priority="High",
            acting_user="Staff Union Rep",
        ),
    )

    # 4. Check for generated CaseRelationship
    overlap = overlap_engine.find_existing_relationship(db_session, case_rb.id, case_pgrc.id)
    assert overlap is not None, "Overlap relationship was not generated between RB and PGRC open cases."
    assert overlap.relationship_type == "Cross-Bureau Coordination Overlap"
    assert overlap.review_status == "Pending Review"
    assert "1-9876543210" in overlap.matching_reason
    assert "RB" in overlap.matching_reason and "PGRC" in overlap.matching_reason

    # 5. Verify audit history action on both cases
    actions_rb = (
        db_session.query(models.CaseAction)
        .filter(models.CaseAction.case_id == case_rb.id, models.CaseAction.action_type == "Overlap Alert Flagged")
        .all()
    )
    assert len(actions_rb) >= 1, "Audit log missing for Case 1 on overlap flagging"

    actions_pgrc = (
        db_session.query(models.CaseAction)
        .filter(models.CaseAction.case_id == case_pgrc.id, models.CaseAction.action_type == "Overlap Alert Flagged")
        .all()
    )
    assert len(actions_pgrc) >= 1, "Audit log missing for Case 2 on overlap flagging"


# ==============================================================================
# SCENARIO B: Similar institution names with different verified identifiers
# ==============================================================================
def test_scenario_b_different_verified_pids_must_not_be_merged(db_session):
    """
    Scenario B: Similar institution names with different verified identifiers
    must not be merged or matched.
    """
    inst1 = models.Institution(
        internal_id="INST-SCENARIO-B1",
        aicte_permanent_id="1-1111111111",
        name="St. Xavier Institute of Engineering & Technology",
        normalized_name=overlap_engine.normalize_institution_name("St. Xavier Institute of Engineering & Technology"),
        address="Campus A, Mumbai",
        region="Western",
    )
    inst2 = models.Institution(
        internal_id="INST-SCENARIO-B2",
        aicte_permanent_id="1-2222222222",  # Distinct verified PID
        name="St. Xavier's Inst of Engg & Tech",  # Extremely similar name
        normalized_name=overlap_engine.normalize_institution_name("St. Xavier's Inst of Engg & Tech"),
        address="Campus B, Pune",
        region="Western",
    )
    db_session.add_all([inst1, inst2])
    db_session.commit()

    case_b1 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-B-01",
            institution_id=inst1.id,
            complaint_category="Admission Irregularities",
            description="Management quota seats filled without proper counseling merit list.",
            assigned_bureau="RB",
        ),
    )

    case_b2 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-B-02",
            institution_id=inst2.id,
            complaint_category="Admission Irregularities",
            description="Management quota counseling discrepancy reported.",
            assigned_bureau="PGRC",
        ),
    )

    # Evaluate pair
    evaluation = overlap_engine.evaluate_case_pair(case_b1, case_b2)
    assert evaluation is None, "SAFEGUARD BREACH: Institutions with different verified PIDs must NOT produce overlap alerts or merges!"

    overlap = overlap_engine.find_existing_relationship(db_session, case_b1.id, case_b2.id)
    assert overlap is None, "Relationship was improperly created for institutions with different verified PIDs."

    # Verify institutions remain completely distinct in database
    db_inst1 = db_session.query(models.Institution).filter(models.Institution.id == inst1.id).first()
    db_inst2 = db_session.query(models.Institution).filter(models.Institution.id == inst2.id).first()
    assert db_inst1.id != db_inst2.id
    assert db_inst1.aicte_permanent_id != db_inst2.aicte_permanent_id


# ==============================================================================
# SCENARIO C: Similar descriptions from different institutions
# ==============================================================================
def test_scenario_c_similar_descriptions_different_institutions(db_session):
    """
    Scenario C: Similar descriptions from different institutions must not be treated
    as the same institution.
    """
    inst_c1 = models.Institution(
        internal_id="INST-SCENARIO-C1",
        aicte_permanent_id="1-3333333333",
        name="Himalayan College of Engineering",
        normalized_name=overlap_engine.normalize_institution_name("Himalayan College of Engineering"),
        address="Dehradun",
        region="Northern",
    )
    inst_c2 = models.Institution(
        internal_id="INST-SCENARIO-C2",
        aicte_permanent_id="1-4444444444",
        name="Konkan Polytechnic Institute",
        normalized_name=overlap_engine.normalize_institution_name("Konkan Polytechnic Institute"),
        address="Ratnagiri",
        region="Western",
    )
    db_session.add_all([inst_c1, inst_c2])
    db_session.commit()

    verbatim_text = "Refusal of college administration to refund security caution deposit and retention of original 10th and 12th certificates after course completion."

    case_c1 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-C-01",
            institution_id=inst_c1.id,
            complaint_category="Original Document Retention",
            description=verbatim_text,
            assigned_bureau="PGRC",
        ),
    )

    case_c2 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-C-02",
            institution_id=inst_c2.id,
            complaint_category="Original Document Retention",
            description=verbatim_text,  # Identical description
            assigned_bureau="RB",
        ),
    )

    evaluation = overlap_engine.evaluate_case_pair(case_c1, case_c2)
    assert evaluation is None, "SAFEGUARD BREACH: Similar descriptions from distinct institutions must not trigger institution overlap!"

    overlap = overlap_engine.find_existing_relationship(db_session, case_c1.id, case_c2.id)
    assert overlap is None, "No relationship record should exist between cases from distinct verified institutions."


# ==============================================================================
# SCENARIO D: Repeated updates must not generate duplicate alerts
# ==============================================================================
def test_scenario_d_repeated_updates_no_duplicate_alerts(db_session):
    """
    Scenario D: Repeated updates or re-scans must not generate duplicate alerts
    for the same unresolved relationship (Rule 9).
    """
    # Count initial relationships between Scenario A cases
    existing_rels = (
        db_session.query(models.CaseRelationship)
        .filter(
            models.CaseRelationship.first_case_id.in_(["AICTE-SCENARIO-A-RB", "AICTE-SCENARIO-A-PGRC"]),
            models.CaseRelationship.second_case_id.in_(["AICTE-SCENARIO-A-RB", "AICTE-SCENARIO-A-PGRC"]),
        )
        .all()
    )
    assert len(existing_rels) == 1, "Pre-condition failed: expected exactly 1 relationship."

    # Update Case 1 multiple times (assignment and status updates)
    crud.update_case_assignment(
        db_session,
        "AICTE-SCENARIO-A-RB",
        schemas.CaseAssignmentUpdate(
            assigned_bureau="RB",
            assigned_officer="Dr. V. Narayanan (Joint Director)",
            acting_user="Chief Vigilance Officer",
            remarks="Reassigned to senior inquiry officer",
        ),
    )

    crud.update_case_assignment(
        db_session,
        "AICTE-SCENARIO-A-PGRC",
        schemas.CaseAssignmentUpdate(
            assigned_bureau="PGRC",
            assigned_officer="Dr. S. Sengupta (Deputy Director)",
            acting_user="Registrar AICTE",
            remarks="Assigned to hearing bench",
        ),
    )

    # Run global scan explicitly
    scan_res = overlap_engine.scan_all_database_overlaps(db_session)

    # Verify still exactly 1 relationship exists
    existing_rels_after = (
        db_session.query(models.CaseRelationship)
        .filter(
            models.CaseRelationship.first_case_id.in_(["AICTE-SCENARIO-A-RB", "AICTE-SCENARIO-A-PGRC"]),
            models.CaseRelationship.second_case_id.in_(["AICTE-SCENARIO-A-RB", "AICTE-SCENARIO-A-PGRC"]),
        )
        .all()
    )
    assert len(existing_rels_after) == 1, f"DUPLICATE ALERT GENERATED! Found {len(existing_rels_after)} alerts."


# ==============================================================================
# SCENARIO E: Rejected suggestions must preserve both cases
# ==============================================================================
def test_scenario_e_rejected_suggestions_preserve_both_cases(db_session, client):
    """
    Scenario E: Rejected suggestions must preserve both cases intact with complete audit history.
    Never automatically delete or close complaints.
    """
    # 1. Create two unverified cases with fuzzy name match to create a suggestion
    inst_e1 = models.Institution(
        internal_id="INST-SCENARIO-E1",
        aicte_permanent_id=None,  # Unverified
        name="National Polytechnic Academy",
        normalized_name=overlap_engine.normalize_institution_name("National Polytechnic Academy"),
        address="North Block, Jaipur",
        region="North-West",
    )
    inst_e2 = models.Institution(
        internal_id="INST-SCENARIO-E2",
        aicte_permanent_id=None,  # Unverified
        name="National Poly Academy",  # Fuzzy match >= 85%
        normalized_name=overlap_engine.normalize_institution_name("National Poly Academy"),
        address="South Block, Jaipur",
        region="North-West",
    )
    db_session.add_all([inst_e1, inst_e2])
    db_session.commit()

    case_e1 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-E-01",
            institution_id=inst_e1.id,
            complaint_category="Infrastructure Deficiencies",
            description="Lack of required computer lab equipment in computer engineering department.",
            assigned_bureau="Approval Bureau",
            assigned_officer="Er. R. K. Sharma",
        ),
    )

    case_e2 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-SCENARIO-E-02",
            institution_id=inst_e2.id,
            complaint_category="Ragging & Safety Concerns",
            description="Absence of mandatory anti-ragging squad displays in hostel premises.",
            assigned_bureau="Anti-Ragging Cell",
            assigned_officer="Adv. Sunita Rao",
        ),
    )

    # Check that suggestion was created
    rel = overlap_engine.find_existing_relationship(db_session, case_e1.id, case_e2.id)
    assert rel is not None
    assert rel.relationship_type == "Suggested Institution Identity Match"

    # 2. Review and Reject via API
    resp = client.post(
        f"/api/overlaps/{rel.id}/review",
        json={
            "review_status": "Rejected",
            "reviewed_by": "Dr. Anirudh Sen (Director, Approval Bureau)",
            "review_remarks": "Verified as two distinct legal entities with separate Trust deeds. Do not link or merge.",
        },
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["review_status"] == "Rejected"
    assert res_data["reviewed_by"] == "Dr. Anirudh Sen (Director, Approval Bureau)"

    # 3. VERIFY SAFEGUARD: Both cases MUST remain preserved, open, and unaltered
    case1_after = crud.get_complaint_by_id(db_session, "AICTE-SCENARIO-E-01")
    case2_after = crud.get_complaint_by_id(db_session, "AICTE-SCENARIO-E-02")

    assert case1_after is not None, "Case E-01 was deleted!"
    assert case2_after is not None, "Case E-02 was deleted!"
    assert case1_after.status in ["Pending", "Assigned"]
    assert case2_after.status in ["Pending", "Assigned"]
    assert case1_after.complaint_category == "Infrastructure Deficiencies"
    assert case2_after.complaint_category == "Ragging & Safety Concerns"

    # 4. Check audit log for rejection
    actions_e1 = (
        db_session.query(models.CaseAction)
        .filter(models.CaseAction.case_id == case1_after.id, models.CaseAction.action_type == "Suggested Relationship Rejected")
        .all()
    )
    assert len(actions_e1) >= 1, "Rejection audit action missing on Case E-01"


# ==============================================================================
# SCENARIO F: Confirmed relationships and review decisions persist after restart
# ==============================================================================
def test_scenario_f_decisions_persist_across_restart(client):
    """
    Scenario F: Confirmed relationships and review decisions must persist after restart.
    Simulated by executing review via API, disposing the engine connection pool,
    and verifying from a completely new database session and fresh client request.
    """
    # 1. Fetch the overlap between Scenario A cases
    list_resp = client.get("/api/overlaps?status=Pending Review")
    assert list_resp.status_code == 200
    overlaps = list_resp.json()["data"]
    target_rel = next((o for o in overlaps if o["first_case_id"] == "AICTE-SCENARIO-A-RB" or o["second_case_id"] == "AICTE-SCENARIO-A-RB"), None)
    assert target_rel is not None, "Scenario A overlap record not found in Pending Review"

    # 2. Authorized official mandates joint bureau coordination
    review_resp = client.post(
        f"/api/overlaps/{target_rel['id']}/review",
        json={
            "review_status": "Coordination Required",
            "reviewed_by": "Prof. T. G. Sitharam (Chairman, AICTE Coordination Bench)",
            "review_remarks": "Convene Joint Inquiry Session between RB and PGRC to synchronize inspections.",
        },
    )
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["review_status"] == "Coordination Required"

    # 3. Simulate Backend Restart by closing connections and opening a brand-new session
    test_engine.dispose()
    new_db = TestingSessionLocal()
    try:
        persisted_rel = (
            new_db.query(models.CaseRelationship)
            .filter(models.CaseRelationship.id == target_rel["id"])
            .first()
        )
        assert persisted_rel is not None
        assert persisted_rel.review_status == "Coordination Required"
        assert persisted_rel.reviewed_by == "Prof. T. G. Sitharam (Chairman, AICTE Coordination Bench)"
        assert "Convene Joint Inquiry Session" in persisted_rel.review_remarks
        assert persisted_rel.review_timestamp is not None

        # Verify audit action persisted on both cases
        actions = (
            new_db.query(models.CaseAction)
            .filter(
                models.CaseAction.case_id.in_([persisted_rel.first_case_id, persisted_rel.second_case_id]),
                models.CaseAction.action_type == "Coordination Directive Issued",
            )
            .all()
        )
        assert len(actions) == 2, "Expected audit entries on both cases persisted across restart."
    finally:
        new_db.close()

    # 4. Also verify API reads the persisted data accurately
    fresh_get = client.get(f"/api/overlaps/{target_rel['id']}")
    assert fresh_get.status_code == 200
    fetched_body = fresh_get.json()
    assert fetched_body["review_status"] == "Coordination Required"
    assert fetched_body["reviewed_by"] == "Prof. T. G. Sitharam (Chairman, AICTE Coordination Bench)"
    assert len(fetched_body["review_history"]) >= 1


# ==============================================================================
# RULE 10: Auto-updating/archiving alerts when case reaches terminal status
# ==============================================================================
def test_rule_10_status_transition_updates_active_alerts(db_session, client):
    """
    Rule 10: When a case is resolved, closed, or disposed, active pending overlap
    alerts involving that case are updated/archived.
    """
    # 1. Create verified institution and two open cases
    inst = models.Institution(
        internal_id="INST-RULE-10",
        aicte_permanent_id="1-5555555555",
        name="Zenith College of Management & Tech",
        normalized_name=overlap_engine.normalize_institution_name("Zenith College of Management & Tech"),
        address="Hyderabad",
        region="South-Central",
    )
    db_session.add(inst)
    db_session.commit()

    c1 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-RULE-10-A",
            institution_id=inst.id,
            complaint_category="Curriculum & Accreditation",
            description="Offering unapproved postgraduate diploma courses without AICTE board sanction.",
            assigned_bureau="Approval Bureau",
        ),
    )
    c2 = crud.create_complaint(
        db_session,
        schemas.ComplaintCaseCreate(
            custom_case_id="AICTE-RULE-10-B",
            institution_id=inst.id,
            complaint_category="Financial Anomaly",
            description="Unapproved fee structure for PG diploma.",
            assigned_bureau="RB",
        ),
    )

    rel = overlap_engine.find_existing_relationship(db_session, c1.id, c2.id)
    assert rel is not None
    assert rel.review_status == "Pending Review"

    # 2. Now resolve Case A
    crud.update_case_status(
        db_session,
        c1.id,
        schemas.CaseStatusUpdate(
            status="Disposed",
            acting_user="Director, Approval Bureau",
            remarks="Course discontinued by institution; compliance affidavit submitted and accepted.",
        ),
    )

    # 3. Refresh relationship from DB
    db_session.refresh(rel)
    assert rel.review_status == "Resolved - Inactive Case"
    assert "Disposed" in rel.review_remarks
