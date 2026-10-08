"""AirDose FastAPI Application Entrypoint.
Modular REST API with SQLite database, OpenAQ integration, and authentication.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers import auth, locations, air_quality, exposure


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context to initialize the SQLite database on startup."""
    init_db()
    yield


app = FastAPI(
    title="AirDose API",
    description="Air Quality Monitoring & Location Intelligence Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modular API routers
app.include_router(auth.router)
app.include_router(locations.router)
app.include_router(air_quality.router)
app.include_router(exposure.router)


@app.get("/health", tags=["Health"])
def health():
    """Service health check endpoint."""
    return {
        "status": "ok",
        "service": "AirDose API",
        "database": "sqlite3",
    }