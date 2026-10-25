import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import models, database, config
from app.seed import seed_database
from app.routers import (
    health,
    institutions,
    complaints,
    actions,
    overlaps,
    notifications,
    dashboard,
    reports,
    users,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aicte-backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    logger.info("Initializing database tables...")
    models.Base.metadata.create_all(bind=database.engine)

    if config.SEED_DEMO_DATA_ON_STARTUP:
        logger.info("Development / Demo mode: verifying seed demonstration data...")
        db = database.SessionLocal()
        try:
            seed_database(db)
            logger.info("Database seeding successfully verified.")
        except Exception as exc:
            logger.error(f"Error during database seeding: {exc}", exc_info=True)
        finally:
            db.close()
    else:
        logger.info("Production mode: automatic demo data seeding skipped.")

    yield
    logger.info("AICTE Backend shutting down.")


app = FastAPI(
    title=config.APP_NAME,
    description="Backend REST API and Database for AICTE Integrated Institution Complaint Monitoring System.",
    version="1.0.0",
    docs_url="/docs" if config.ENABLE_DOCS else None,
    redoc_url="/redoc" if config.ENABLE_DOCS else None,
    lifespan=lifespan,
)


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if config.ENFORCE_HTTPS:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Configure CORS
if config.IS_PRODUCTION:
    origins = config.CORS_ORIGINS
else:
    origins = list(set((config.CORS_ORIGINS or []) + [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(institutions.router, prefix="/api")
app.include_router(complaints.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(overlaps.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(users.router, prefix="/api")

# Also include root-level health check for load balancer health probes
app.include_router(health.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": config.APP_NAME,
        "status": "Online",
        "environment": config.APP_ENV,
        "docs": "/docs" if config.ENABLE_DOCS else "Disabled in production",
        "version": "1.0.0",
    }
