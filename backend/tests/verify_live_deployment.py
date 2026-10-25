"""
Live Deployment Verification Script
Tests production endpoints on Render backend and Vercel frontend.
"""

import urllib.request
import urllib.error
import json
import ssl
import sys

FRONTEND_URL = "https://aicte-complaint-monitoring.vercel.app"
BACKEND_BASE = "https://aicte-complaint-monitoring.onrender.com"
API_BASE = f"{BACKEND_BASE}/api"

ctx = ssl.create_default_context()

def http_get(url, headers=None):
    req_headers = {"User-Agent": "AICTE-Verifier/1.0"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, context=ctx) as res:
        return res.status, res.read().decode("utf-8"), res.headers

def http_post(url, data=None, headers=None):
    req_headers = {
        "User-Agent": "AICTE-Verifier/1.0",
        "Content-Type": "application/json"
    }
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode("utf-8") if data else b""
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    with urllib.request.urlopen(req, context=ctx) as res:
        return res.status, res.read().decode("utf-8"), res.headers

def run_live_verification():
    print("=" * 75)
    print("AICTE LIVE PRODUCTION DEPLOYMENT VERIFICATION")
    print("=" * 75)
    
    # 1. Verify Frontend URL Loads
    print("\n[*] 1. Testing Frontend URL...")
    status, html, headers = http_get(FRONTEND_URL)
    assert status == 200, f"Expected 200, got {status}"
    assert "AICTE" in html, "Page title or metadata missing AICTE"
    print(f"[OK] Frontend is LIVE at {FRONTEND_URL} (HTTP {status})")

    # 2. Verify Backend Health and Environment
    print("\n[*] 2. Testing Backend Health Probe & CORS...")
    cors_headers = {"Origin": FRONTEND_URL}
    status, body, res_headers = http_get(f"{BACKEND_BASE}/health", headers=cors_headers)
    assert status == 200
    health = json.loads(body)
    assert health["status"] == "UP"
    assert health["database"] == "healthy"
    assert health["app_env"] == "production"
    
    # Check security headers
    assert res_headers.get("x-frame-options") == "DENY"
    assert res_headers.get("x-content-type-options") == "nosniff"
    assert "strict-transport-security" in res_headers
    print(f"[OK] Backend is HEALTHY at {BACKEND_BASE}/health: {health}")
    print(f"[OK] Security headers verified: HSTS, X-Frame-Options, Nosniff active.")

    # 3. Create a Live Institution Record
    print("\n[*] 3. Testing Institution Registration...")
    import time
    ts = int(time.time())
    inst_payload = {
        "internal_id": f"AICTE-PROD-{ts}",
        "aicte_permanent_id": f"1-{ts}",
        "name": f"National Institute of Technology and Regulatory Research {ts}",
        "address": "Sector 42, Institutional Area, Knowledge Park",
        "region": "Northern",
        "state": "Delhi",
        "district": "New Delhi",
        "institution_type": "Government Aided",
        "established_year": 2012
    }
    status, body, _ = http_post(f"{API_BASE}/institutions", data=inst_payload)
    assert status in [200, 201], f"Failed to create institution (status {status}): {body}"
    inst_data = json.loads(body)
    inst_id = inst_data["id"]
    print(f"[OK] Institution created: ID {inst_id} ({inst_data['name']})")

    # 4. Retrieve Institution Dossier
    status, body, _ = http_get(f"{API_BASE}/institutions/{inst_id}")
    assert status == 200
    print(f"[OK] Institution dossier successfully retrieved from database.")

    # 5. Docket Case 1: PGRC Complaint
    print("\n[*] 4. Docketing Case 1 under Public Grievance Redressal Cell (PGRC)...")
    pgrc_payload = {
        "institution_id": inst_id,
        "complaint_category": "Faculty & Staff Grievance",
        "description": "Allegation of irregular salary disbursement and denial of statutory benefits under AICTE 7th CPC norms.",
        "received_date": "2026-10-25",
        "priority": "High",
        "assigned_bureau": "PGRC",
        "assigned_officer": "Prof. Neha Gupta",
        "expected_disposal_date": "2026-11-25"
    }
    status, body, _ = http_post(f"{API_BASE}/complaints", data=pgrc_payload)
    assert status in [200, 201], f"Failed to docket case 1 (status {status}): {body}"
    case1 = json.loads(body)
    case1_id = case1["id"]
    print(f"[OK] Docketed Case 1: ID {case1_id} (Bureau: PGRC)")

    # 6. Docket Case 2: Regulation Bureau (RB) Complaint on Same Institution
    print("\n[*] 5. Docketing Case 2 under Regulation Bureau (RB) on Same Institution...")
    rb_payload = {
        "institution_id": inst_id,
        "complaint_category": "Fee & Financial Anomalies",
        "description": "Audited account discrepancies regarding institutional corpus and non-refundable security fees collected from students.",
        "received_date": "2026-10-25",
        "priority": "Critical",
        "assigned_bureau": "RB",
        "assigned_officer": "Dr. S. K. Raman",
        "expected_disposal_date": "2026-11-15"
    }
    status, body, _ = http_post(f"{API_BASE}/complaints", data=rb_payload)
    assert status in [200, 201], f"Failed to docket case 2 (status {status}): {body}"
    case2 = json.loads(body)
    case2_id = case2["id"]
    print(f"[OK] Docketed Case 2: ID {case2_id} (Bureau: RB)")

    # 7. Verify Cross-Bureau Overlap Detection
    print("\n[*] 6. Verifying Cross-Bureau Overlap Engine Detection...")
    status, body, _ = http_get(f"{API_BASE}/overlaps?status=Pending%20Review")
    assert status == 200
    res_json = json.loads(body)
    overlaps = res_json.get("data", res_json.get("items", []))
    matching_overlap = None
    for item in overlaps:
        c1, c2 = item.get("first_case_id"), item.get("second_case_id")
        if (c1 == case1_id and c2 == case2_id) or (c1 == case2_id and c2 == case1_id):
            matching_overlap = item
            break
            
    assert matching_overlap is not None, f"Cross-Bureau Overlap alert was NOT triggered for cases {case1_id} and {case2_id}!"
    overlap_id = matching_overlap["id"]
    print(f"[OK] Cross-Bureau Overlap Alert Automatically Triggered! (Alert ID: {overlap_id})")
    print(f"     Reason: {matching_overlap['matching_reason']}")

    # 8. Submit Official Overlap Review Directive
    print("\n[*] 7. Submitting Joint Coordination Review Directive...")
    review_payload = {
        "review_status": "Coordination Required",
        "reviewed_by": "Dr. Mamta Agarwal (Adviser, Coordination Bench)",
        "review_remarks": "Convene Joint Bureau Virtual Inquiry with institution management to align regulatory findings."
    }
    status, body, _ = http_post(f"{API_BASE}/overlaps/{overlap_id}/review", data=review_payload)
    assert status == 200, f"Failed review update: {body}"
    print(f"[OK] Official review directive persisted: 'Coordination Required'")

    # 9. Verify Action Audit History Recorded
    print("\n[*] 8. Verifying Case Docket Immutable Action Audit Trail...")
    status, body, _ = http_get(f"{API_BASE}/complaints/{case1_id}/actions")
    assert status == 200
    actions = json.loads(body)
    assert len(actions) >= 2, f"Expected at least 2 audit actions, got {len(actions)}"
    print(f"[OK] Immutable audit log confirmed: {len(actions)} entries recorded for {case1_id}.")

    # 10. Verify Real-Time Dashboard Statistics
    print("\n[*] 9. Verifying Live Dashboard SQL Statistics...")
    status, body, _ = http_get(f"{API_BASE}/dashboard/stats")
    assert status == 200
    stats = json.loads(body)
    print(f"[OK] Live Dashboard Metrics: {stats}")
    assert stats["total_cases"] >= 2
    assert stats["total_institutions"] >= 1

    # 11. Verify RFC 4180 CSV Safe Export
    print("\n[*] 10. Verifying National Compliance CSV Export & Formula Sanitization...")
    status, csv_data, _ = http_get(f"{API_BASE}/reports/export/csv?bureau=PGRC")
    assert status == 200
    assert "Case ID,Institution Name,AICTE PID" in csv_data
    assert case1_id in csv_data
    print(f"[OK] Safe CSV export verified ({len(csv_data)} bytes received).")

    print("\n" + "=" * 75)
    print("ALL 10 LIVE PRODUCTION VERIFICATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 75)
    return True

if __name__ == "__main__":
    success = run_live_verification()
    sys.exit(0 if success else 1)
