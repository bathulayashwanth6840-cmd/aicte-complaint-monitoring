# AICTE Integrated Institution Complaint Monitoring & Status Dashboard

**Smart India Hackathon (SIH) Project**  
*A Unified Regulatory Oversight, Inter-Bureau Grievance Coordination, and Deadline Monitoring Platform for the All India Council for Technical Education (AICTE).*

---

## 1. Executive Summary & Capabilities

The **AICTE Integrated Institution Complaint Monitoring and Status Dashboard** unifies complaint intake, regulatory oversight, and grievance tracking across disparate AICTE bureaus. In traditional setups, complaints against the same technical institution may arrive simultaneously at:
- **Public Grievance Redressal Cell (PGRC)**
- **Regulation Bureau (RB)**
- **Approval Bureau (AB)**
- **Anti-Ragging Cell / ICC**

Without an integrated regulatory system, bureaus conduct parallel inquiries, request redundant affidavits, and risk contradictory directives.

### Key Capabilities
1. **Centralized Institutional Registry**: Normalizes institution names and connects dockets to verified AICTE Permanent IDs (PID).
2. **Cross-Bureau Overlap Detection Engine**: Identifies multi-bureau inquiries against the same technical institution using fuzzy matching heuristics and verified PIDs without premature record consolidation.
3. **Statutory Review & Coordination Directives**: Official coordination bench reviews overlap alerts to mandate joint hearings, synchronize proceedings, and preserve an immutable audit trail.
4. **Deadline & SLA Monitoring Engine**: Distinguishes approaching target deadlines from overdue SLA breaches under AICTE Citizen's Charter timelines, utilizing deduplicated notification dispatching.
5. **National Compliance Analytics & Safe Export**: Real-time analytical views with RFC 4180 CSV export sanitized against spreadsheet formula injection (`=`, `+`, `-`, `@`) and enforced by Role-Based Access Control (RBAC).

---

## 2. Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AICTE Frontend (React 19 + Vite)                      │
│  - Government Administrative Design System (Inter / Navy Palette)           │
│  - Real-time Dashboard KPIs | Inter-Bureau Workload Analytics                │
│  - Institutional Dossiers & Linked Complaint History                        │
│  - Cross-Bureau Overlap Alert Banners & Joint Hearing Directives            │
│  - National Compliance Reports Center (8 Analytical Views + CSV Export)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JSON / RFC 4180 CSV)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    FastAPI Backend (Python 3.10+ / 3.14)                    │
│  - Modular Routers: institutions, complaints, overlaps, reports,            │
│    notifications, dashboard, actions, users, health                         │
│  - Cross-Bureau Overlap Engine (SequenceMatcher + Jaccard Ratios)            │
│  - SLA Monitoring & Alert Deduplication Engine                              │
│  - Security Middleware: HSTS, X-Frame-Options, Nosniff, Strict CORS         │
│  - Production Config Hardening (Docs toggle, seed toggle, safe origins)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQLAlchemy 2.0 ORM
┌──────────────────────────────────────▼──────────────────────────────────────┐
│         Relational Database (SQLite with WAL & FKs / PostgreSQL)            │
│  - Models: User, Institution, ComplaintCase, CaseAction,                    │
│    CaseRelationship, Notification                                           │
│  - Cryptographic Passwords (SHA-256) & Immutable Action Audit History       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20+` LTS recommended)
- **npm**: `v9.0.0` or higher
- **Python**: `3.10` to `3.14`
- **Git**: For version control

---

## 4. Setup & Local Development

### 1. Workspace Clone & Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd legal-metrology-dist

# Install frontend dependencies
npm install
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Launching Local Development Servers
In Terminal 1 (Backend):
```bash
cd backend
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000/api`
- Interactive OpenAPI Docs (Development only): `http://127.0.0.1:8000/docs`

In Terminal 2 (Frontend):
```bash
npm run dev -- --host 127.0.0.1 --port 5173
```
- Access web application at: `http://127.0.0.1:5173`

---

## 5. Environment-Specific Configuration

Configuration is externalized through environment variables. Safe template files containing placeholders are maintained:
- Frontend: `.env.production.example`
- Backend: `backend/.env.production.example`

### Backend Environment Variables

| Variable | Description | Development Default | Production Recommended |
|---|---|---|---|
| `APP_ENV` | Application environment stage | `development` | `production` |
| `HOST` | Binding network host | `127.0.0.1` | `0.0.0.0` or private interface |
| `PORT` | Listening network port | `8000` | `8000` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./aicte_complaints.db` | `sqlite:////var/data/aicte/aicte_complaints.db` or PostgreSQL |
| `SECRET_KEY` | Secret key for signatures & auth | Default test key | **Cryptographically random 64-char hex** |
| `CORS_ORIGINS` | Permitted browser origins | `http://localhost:5173,...` | `https://complaints.aicte-india.org` (exact domain) |
| `ENABLE_DOCS` | Enable Swagger UI & ReDoc | `true` | `false` |
| `SEED_DEMO_DATA_ON_STARTUP` | Auto-seed mock dockets | `true` | `false` |
| `ENFORCE_HTTPS` | Enforce HSTS security headers | `false` | `true` |

### Frontend Environment Variables

| Variable | Description | Example Value |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for REST API | `https://api.aicte-complaints.gov.in/api` |
| `VITE_DEMO_MODE` | Enable synthetic mock switcher | `false` (Production) / `true` (Demo) |
| `VITE_APP_TITLE` | Browser window title | `AICTE Integrated Institution Complaint Monitoring System` |

> [!IMPORTANT]
> Never commit `.env` or files containing real secrets to Git. Real databases (`*.db`), `.env` files, and virtual environments are ignored by `.gitignore`.

---

## 6. Database Initialization, Persistence & Migrations

### Database Schema Initialization
On application startup, `Base.metadata.create_all(bind=engine)` automatically checks for and creates any missing tables.

To initialize an empty production database without running the web server:
```bash
cd backend
python -c "from app.database import engine, Base; from app.models import *; Base.metadata.create_all(bind=engine); print('Database tables initialized successfully.')"
```

### Production Persistence Across Restarts & Deployments
- **SQLite Deployments**: SQLite persists data in a single file on disk. When deploying via Docker, Kubernetes, or VM, the database file **must reside on a mounted persistent volume** (e.g. `/var/data/aicte/aicte_complaints.db`). Ephemeral container file systems will lose all records on container recreation.
- **PostgreSQL Migration**: For large-scale national deployments, change `DATABASE_URL` to:
  ```env
  DATABASE_URL=postgresql+psycopg2://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>
  ```
  Install the PostgreSQL driver via `pip install psycopg2-binary`.

### Alembic Migration Setup (Recommended for PostgreSQL)
For schema evolution over time:
```bash
cd backend
# Initialize Alembic
alembic init alembic

# Generate migration revision
alembic revision --autogenerate -m "initial_schema"

# Apply migrations
alembic upgrade head
```

---

## 7. Tested Database Backup & Recovery

The project includes an online backup, integrity verification, and recovery utility at `backend/scripts/backup_restore.py`.

### 1. Database Verification
Validates SQLite page integrity (`PRAGMA integrity_check`) and audits record counts:
```bash
cd backend
py scripts/backup_restore.py verify aicte_complaints.db
```

### 2. Performing a Point-in-Time Online Backup
Creates a non-blocking snapshot using SQLite's online backup API, computes SHA-256 checksum, and self-verifies the backup:
```bash
cd backend
py scripts/backup_restore.py backup aicte_complaints.db /path/to/backups/
```

### 3. Restoring from a Backup
Verifies backup integrity, takes a pre-restore safety snapshot of the destination, and restores the database:
```bash
cd backend
py scripts/backup_restore.py restore /path/to/backups/aicte_complaints_backup_YYYYMMDD_HHMMSS.db aicte_complaints.db
```

### 4. PostgreSQL Production Backup Commands
For PostgreSQL installations:
```bash
# Backup
pg_dump -h <DB_HOST> -U <DB_USER> -F c -b -v -f "aicte_backup_$(date +%Y%m%d).dump" <DB_NAME>

# Restore
pg_restore -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -v "aicte_backup_YYYYMMDD.dump"
```

---

## 8. Production Hardening & Security

The application incorporates multi-layer security hardening for government deployment:

1. **Security Headers Middleware**:
   - `X-Content-Type-Options: nosniff` (Prevents MIME sniffing attacks)
   - `X-Frame-Options: DENY` (Mitigates clickjacking)
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (Enabled when `ENFORCE_HTTPS=true`)
2. **Strict Origin CORS Filtering**:
   - Production origins are parsed strictly from `CORS_ORIGINS`. Localhost and wildcard origins are disabled in production mode.
3. **Debug & Documentation Exposure**:
   - Interactive OpenAPI documentation (`/docs`, `/redoc`, `/openapi.json`) is disabled when `ENABLE_DOCS=false`.
4. **Seed Data Isolation**:
   - Synthetic demo accounts and sample cases are excluded when `SEED_DEMO_DATA_ON_STARTUP=false`.
5. **Formula Injection Sanitization**:
   - All exported CSV fields undergo RFC 4180 escaping and formula sanitization (prepending `'` to any cell starting with `=`, `+`, `-`, or `@`).
6. **Password Hashing & RBAC**:
   - User credentials use SHA-256 password hashing.

---

## 9. Deployment Guide

### Option A: Linux VM (Systemd + Nginx + Gunicorn/Uvicorn)

1. **Build Frontend**:
   ```bash
   npm run build
   # Copy dist/ directory to web root:
   sudo cp -r dist/* /var/www/aicte-complaints/
   ```

2. **Configure Systemd Service for Backend** (`/etc/systemd/system/aicte-backend.service`):
   ```ini
   [Unit]
   Description=AICTE Complaint Monitoring Backend Service
   After=network.target

   [Service]
   User=aicte
   WorkingDirectory=/opt/aicte-complaints/backend
   EnvironmentFile=/opt/aicte-complaints/backend/.env
   ExecStart=/opt/aicte-complaints/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
   Start and enable:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now aicte-backend
   ```

3. **Configure Nginx Reverse Proxy with HTTPS** (`/etc/nginx/sites-available/aicte`):
   ```nginx
   server {
       listen 80;
       server_name complaints.aicte-india.org;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name complaints.aicte-india.org;

       ssl_certificate /etc/letsencrypt/live/complaints.aicte-india.org/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/complaints.aicte-india.org/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;

       # Frontend SPA static files
       root /var/www/aicte-complaints;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Backend API proxy
       location /api/ {
           proxy_pass http://127.0.0.1:8000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto https;
       }

       location /health {
           proxy_pass http://127.0.0.1:8000/health;
       }
   }
   ```

---

## 10. Automated Tests & Verification

The application features comprehensive automated test suites covering API contracts, cross-bureau overlap heuristics, deadline calculations, and production startup configurations.

### 1. Running the Automated Test Suite (38 Tests)
```bash
cd backend
py -m pytest -v
```

Execution Summary:
```text
tests/test_api.py (23 tests)
  ✓ test_health_check
  ✓ test_users_list_and_roles
  ✓ test_create_user_and_duplicate_prevention
  ✓ test_user_authentication_and_login_validation
  ✓ test_get_institutions_and_search
  ✓ test_create_institution_and_validation
  ✓ test_institution_detail_and_complaint_history
  ✓ test_create_complaint_and_audit_init
  ✓ test_create_complaint_foreign_key_validation
  ✓ test_create_complaint_pydantic_validation
  ✓ test_complaint_multi_facet_filtering
  ✓ test_case_assignment_creates_audit_action
  ✓ test_case_status_update_creates_audit_action
  ✓ test_case_transfer_and_escalation
  ✓ test_global_actions_audit_history
  ✓ test_overlaps_list_and_review
  ✓ test_manual_overlap_linking_and_validation
  ✓ test_notifications_crud_and_mark_read
  ✓ test_dashboard_statistics
  ✓ test_bureau_workload_and_distributions
  ✓ test_reports_summary
  ✓ test_csv_export
  ✓ test_database_persistence_across_sessions

tests/test_notifications_and_reports.py (7 tests)
  ✓ test_timeline_rules_approaching_vs_overdue
  ✓ test_configurable_deadline_thresholds
  ✓ test_deadline_monitoring_scan_and_deduplication
  ✓ test_reports_summary_with_all_filters
  ✓ test_safe_csv_export_and_formula_injection_protection
  ✓ test_csv_export_role_based_pii_redaction
  ✓ test_displayed_totals_match_exported_records

tests/test_overlap_engine.py (7 tests)
  ✓ test_scenario_a_cross_bureau_coordination_alert
  ✓ test_scenario_b_different_verified_pids_must_not_be_merged
  ✓ test_scenario_c_similar_descriptions_different_institutions
  ✓ test_scenario_d_repeated_updates_no_duplicate_alerts
  ✓ test_scenario_e_rejected_suggestions_preserve_both_cases
  ✓ test_scenario_f_decisions_persist_across_restart
  ✓ test_rule_10_status_transition_updates_active_alerts

tests/test_production_config_startup.py (1 test)
  ✓ test_production_mode_isolated_startup

======================== 38 passed in 6.25s (100% Pass) ========================
```

### 2. End-to-End Demo Workflow Verification
```bash
cd backend
py tests/verify_demo_workflow.py
```
Validates all 9 end-to-end integration steps:
1. Institution registration with verified AICTE PID
2. PGRC complaint docketing
3. Simultaneous RB complaint docketing on same institution
4. Automatic cross-bureau overlap detection alert
5. Statutory review & coordination directive issuance
6. Case status update and scheduling
7. Immutable docket action audit history verification
8. Real-time SQL aggregate dashboard metrics
9. RFC 4180 CSV export with formula injection sanitization

### 3. Isolated Production Configuration Startup Verification
```bash
cd backend
py tests/verify_production_startup.py
```
Confirms the application boots cleanly with production settings (`APP_ENV=production`, `ENABLE_DOCS=false`, `SEED_DEMO_DATA_ON_STARTUP=false`, `ENFORCE_HTTPS=true`).

---

## 11. Operational Troubleshooting

### 1. Port Conflict (`Errno 98 Address already in use` / `WinError 10048`)
- **Cause**: Another instance of Uvicorn or Node is bound to port 8000 or 5173.
- **Resolution**:
  ```bash
  # Windows: Find process and terminate
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F

  # Linux:
  sudo lsof -i :8000
  sudo kill -9 <PID>
  ```

### 2. CORS Preflight Failure (`Access to fetch has been blocked by CORS policy`)
- **Cause**: The incoming browser origin is not included in `CORS_ORIGINS`.
- **Resolution**:
  Ensure the deployed domain (including protocol and port if non-standard) is listed in `backend/.env`:
  ```env
  CORS_ORIGINS=https://complaints.aicte-india.org,https://admin.aicte-india.org
  ```

### 3. Database Locked Error (`sqlite3.OperationalError: database is locked`)
- **Cause**: High concurrency write collisions or an unclosed database transaction.
- **Resolution**:
  - The application automatically configures WAL mode (`PRAGMA journal_mode=WAL;`) and SQLite connection timeout.
  - Verify that no lingering GUI tools or uncommitted manual scripts hold a write lock on `aicte_complaints.db`.
  - For high concurrency (>50 simultaneous writes/sec), migrate to PostgreSQL as documented in Section 6.

### 4. Permission Denied on Persistent Volume (Docker / Linux)
- **Cause**: The container user does not have write permissions to the mounted directory.
- **Resolution**:
  ```bash
  sudo chown -R 1000:1000 /var/data/aicte
  sudo chmod -R 750 /var/data/aicte
  ```

### 5. Verifying Security Headers via cURL
Test that security headers are returned in production:
```bash
curl -I https://complaints.aicte-india.org/health
```
Verify the presence of:
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `strict-transport-security: max-age=63072000; includeSubDomains; preload`
