# AICTE Integrated Institution Complaint Monitoring System - Backend & Database

Backend REST API, relational database, overlap detection engine, and deadline monitoring service built for the **AICTE Integrated Institution Complaint Monitoring and Status Dashboard** (Smart India Hackathon).

---

## 1. Technology Stack

- **Framework**: Python FastAPI (`v0.115+`) with Uvicorn ASGI server
- **ORM & Database**: SQLAlchemy (`v2.0+`) with SQLite local prototype (`PRAGMA foreign_keys=ON;`) / PostgreSQL production ready
- **Data Validation & Serialization**: Pydantic (`v2+`) models with strict validation
- **Testing**: Pytest (`v8+`) with `fastapi.testclient.TestClient` (38 automated test cases)
- **Security**: Security headers middleware (HSTS, X-Frame-Options, Nosniff), SHA-256 password hashing, formula injection sanitization, CORS origin filtering
- **Backup & Recovery**: Online SQLite backup utility (`scripts/backup_restore.py`) with integrity checking

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── config.py              # Externalized environment settings & production flags
│   ├── crud.py                # Database operations & SHA-256 password hashing
│   ├── database.py            # SQLAlchemy engine, session maker & FK pragmas
│   ├── main.py                # FastAPI app, security middleware & router mounting
│   ├── models.py              # Relational models (Users, Institutions, Cases, etc.)
│   ├── schemas.py             # Pydantic v2 validation models
│   ├── seed.py                # Synthetic prototype demonstration seeder
│   └── routers/               # Modular REST endpoints
│       ├── actions.py         # Case action history & audit logs
│       ├── complaints.py      # Complaint docketing, assignments & workflow
│       ├── dashboard.py       # SQL aggregate metrics & bureau workload
│       ├── health.py          # /health probe with DB connectivity check
│       ├── institutions.py    # Institution registry & PID validation
│       ├── notifications.py   # Deadline monitor & notification dispatch
│       ├── overlaps.py        # Cross-bureau overlap detection & review
│       ├── reports.py         # Compliance reports & RFC 4180 CSV export
│       └── users.py           # User management & authentication verification
├── scripts/
│   └── backup_restore.py      # Online backup, integrity check & recovery utility
├── tests/
│   ├── test_api.py            # 23 API endpoint & persistence tests
│   ├── test_notifications_and_reports.py # 7 SLA & safe export tests
│   ├── test_overlap_engine.py # 7 Overlap heuristic & review tests
│   ├── test_production_config_startup.py # Automated test for production startup
│   ├── verify_demo_workflow.py # 9-step end-to-end integration verification
│   └── verify_production_startup.py # Standalone clean-process production verification
├── .env.example               # Safe development environment template
├── .env.production.example    # Safe production environment template
├── requirements.txt           # Python dependencies
└── aicte_complaints.db        # Relational SQLite database
```

---

## 3. Configuration & Production Flags

Backend settings are managed in `app/config.py` using environment variables:

| Variable | Default (Dev) | Production Recommended | Description |
|---|---|---|---|
| `APP_ENV` | `development` | `production` | Environment tier |
| `DATABASE_URL` | `sqlite:///./aicte_complaints.db` | Persistent volume path or PostgreSQL | Connection URI |
| `SECRET_KEY` | Prototype key | Cryptographic 64-char string | Signature secret |
| `CORS_ORIGINS` | `http://localhost:5173,...` | `https://complaints.aicte-india.org` | Authorized browser origins |
| `ENABLE_DOCS` | `true` | `false` | Enable/disable Swagger & ReDoc |
| `SEED_DEMO_DATA_ON_STARTUP` | `true` | `false` | Enable/disable mock data injection |
| `ENFORCE_HTTPS` | `false` | `true` | Attach HSTS headers |

---

## 4. Running the Backend

### Local Development Mode
```bash
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Production Mode
Set environment variables or prepare `.env`:
```bash
export APP_ENV=production
export SEED_DEMO_DATA_ON_STARTUP=false
export ENABLE_DOCS=false
export CORS_ORIGINS="https://complaints.aicte-india.org"
export ENFORCE_HTTPS=true

py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 5. Database Backup, Verification & Recovery

Use `scripts/backup_restore.py` for safe operations without stopping the server:

```bash
# 1. Verify database integrity
py scripts/backup_restore.py verify aicte_complaints.db

# 2. Perform point-in-time online backup
py scripts/backup_restore.py backup aicte_complaints.db backups/

# 3. Restore database from backup
py scripts/backup_restore.py restore backups/aicte_complaints_backup_YYYYMMDD_HHMMSS.db aicte_complaints.db
```

---

## 6. Automated Testing

Run all 38 test cases:
```bash
py -m pytest -v
```

Run isolated production startup verification:
```bash
py tests/verify_production_startup.py
```

Run 9-step end-to-end integration verification:
```bash
py tests/verify_demo_workflow.py
```
