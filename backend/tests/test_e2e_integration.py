import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(method, endpoint, body=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(body).encode('utf-8') if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body) if res_body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        return e.code, json.loads(err_body) if err_body else None

def run_e2e_test():
    print("=" * 60)
    print("AICTE BACKEND & FRONTEND INTEGRATION END-TO-END TEST")
    print("=" * 60)

    # 0. Initial Dashboard Counts
    status_code, initial_stats = make_request("GET", "/dashboard/stats")
    assert status_code == 200, f"Dashboard stats failed: {initial_stats}"
    initial_total = initial_stats["total_cases"]
    initial_inst = initial_stats["total_institutions"]
    print(f"[*] Step 0: Initial database counts: {initial_total} cases, {initial_inst} institutions.")

    # 1. Register a synthetic institution
    unique_suffix = int(time.time()) % 100000
    inst_payload = {
        "name": f"National Cyber Engineering Academy {unique_suffix}",
        "aicte_permanent_id": f"1-7788{unique_suffix:04d}",
        "region": "Western",
        "state": "Maharashtra",
        "district": "Pune",
        "address": "Cyber Park Phase-2, Hinjawadi, Pune 411057",
        "institution_type": "Private-Self Financing",
        "established_year": 2018
    }
    status_code, created_inst = make_request("POST", "/institutions", inst_payload)
    assert status_code == 201, f"Institution registration failed: {created_inst}"
    inst_id = created_inst["id"]
    inst_pid = created_inst["aicte_permanent_id"]
    print(f"[OK] Step 1: Registered synthetic institution '{created_inst['name']}' (ID: {inst_id}, PID: {inst_pid}).")

    # 2. Create a complaint
    complaint_payload = {
        "institution_id": inst_id,
        "complaint_category": "Capitation Fee / Irregular Fee Demand",
        "description": "Institute demanded unauthorized campus development fees in cash exceeding approved ceiling.",
        "priority": "High",
        "assigned_bureau": "PAB",
        "assigned_officer": "Dr. Ananya Sen",
        "acting_user": "National Intake Officer",
        "complainant_name": "Kunal Singhania",
        "complainant_type": "Student",
        "complainant_contact": "kunal.singh@gmail.com"
    }
    status_code, created_case = make_request("POST", "/complaints", complaint_payload)
    assert status_code == 201, f"Complaint creation failed: {created_case}"
    case_id = created_case["id"]
    print(f"[OK] Step 2: Created complaint case '{case_id}' against Institution ID {inst_id}.")

    # 3. Assign it to PGRC
    assign_payload = {
        "assigned_bureau": "PGRC",
        "assigned_officer": "Dr. V. K. Sharma",
        "remarks": "Reassigned from PAB to Public Grievance Redressal Cell for statutory hearing.",
        "acting_user": "Central Administrator"
    }
    status_code, assigned_case = make_request("POST", f"/complaints/{case_id}/assign", assign_payload)
    assert status_code == 200, f"Assignment failed: {assigned_case}"
    assert assigned_case["assigned_bureau"] == "PGRC", f"Expected PGRC, got {assigned_case['assigned_bureau']}"
    assert assigned_case["assigned_officer"] == "Dr. V. K. Sharma"
    print(f"[OK] Step 3: Reassigned case '{case_id}' to PGRC (Lead Officer: Dr. V. K. Sharma).")

    # 4. Update the complaint status
    status_payload = {
        "status": "Hearing Scheduled",
        "remarks": "Formal notice issued; virtual hearing fixed for upcoming Wednesday.",
        "acting_user": "Dr. V. K. Sharma"
    }
    status_code, updated_case = make_request("POST", f"/complaints/{case_id}/status", status_payload)
    assert status_code == 200, f"Status update failed: {updated_case}"
    assert updated_case["status"] == "Hearing Scheduled"
    print(f"[OK] Step 4: Updated case status to '{updated_case['status']}'.")

    # 5. Refresh / reload from database and verify persistence
    status_code, refreshed_case = make_request("GET", f"/complaints/{case_id}")
    assert status_code == 200, f"Case refresh failed: {refreshed_case}"
    assert refreshed_case["id"] == case_id
    assert refreshed_case["status"] == "Hearing Scheduled"
    assert refreshed_case["assigned_bureau"] == "PGRC"
    assert refreshed_case["assigned_officer"] == "Dr. V. K. Sharma"
    print(f"[OK] Step 5: Refreshed page / database query. Record persisted cleanly.")

    # 6. Open its action history
    status_code, actions = make_request("GET", f"/complaints/{case_id}/actions")
    assert status_code == 200, f"Actions fetch failed: {actions}"
    assert len(actions) >= 3, f"Expected at least 3 actions, found {len(actions)}"
    action_types = [a["action_type"] for a in actions]
    assert "Case Docketed" in action_types
    assert "Reassignment" in action_types
    assert "Status Update" in action_types
    print(f"[OK] Step 6: Verified complete audit trail ({len(actions)} actions recorded: {', '.join(action_types)}).")

    # 7. Verify dashboard counts reflect the database
    status_code, new_stats = make_request("GET", "/dashboard/stats")
    assert status_code == 200, f"New stats failed: {new_stats}"
    assert new_stats["total_cases"] == initial_total + 1, f"Expected {initial_total + 1}, got {new_stats['total_cases']}"
    assert new_stats["total_institutions"] == initial_inst + 1
    print(f"[OK] Step 7: Dashboard counts accurately incremented in real time:")
    print(f"      Total Cases: {initial_total} -> {new_stats['total_cases']}")
    print(f"      Total Institutions: {initial_inst} -> {new_stats['total_institutions']}")
    print(f"      Under Process Cases: {new_stats['under_process_cases']}")

    # 8. Search and filter the case list
    filter_params = "/complaints?bureau=PGRC&status=Hearing%20Scheduled&search=unauthorized"
    status_code, search_res = make_request("GET", filter_params)
    assert status_code == 200, f"Filtered search failed: {search_res}"
    matched_ids = [c["id"] for c in search_res["data"]]
    assert case_id in matched_ids, f"Expected case {case_id} in search results: {matched_ids}"
    print(f"[OK] Step 8: Multi-facet search and filter verified. Found matching case: {case_id}.")

    print("=" * 60)
    print("ALL 8 END-TO-END INTEGRATION TEST STEPS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_test()
