# AirDose Backend

FastAPI microservice handling personal air pollution dosimeter calculations, OpenAQ v3 integration, spatio-temporal caching, and user location persistence.

## Architecture & Responsibilities

The backend follows a layered, feature-oriented structure with strict separation of concerns:

- `app/core/`: Pure business logic, scientific formulas, unit conversions, and settings.
  - `config.py`: Centralized environment configuration (`Settings`).
  - `constants.py`: Medical & physiological constants, ventilation baselines, and EPA thresholds.
  - `exposure.py`: Inhalation rate & accumulated dose calculation engine.
  - `aqi.py`: US EPA / CPCB multi-pollutant sub-index breakpoint math.
  - `infiltration.py`: Indoor/outdoor PM2.5 infiltration factors based on ventilation.
  - `haversine.py`: Fast great-circle geographic distance formulas.
  - `location_resolver.py`: Geofencing & micro-environment resolution.
  - `station_selector.py`: Distance-weighted monitoring station selection.
- `app/routers/`: HTTP endpoints, request validation, and status code dispatch.
  - `auth.py`: User registration and authentication.
  - `air_quality.py`: OpenAQ monitoring observations & AQI matrix.
  - `exposure.py`: Continuous personal inhalation dosimeter tracking ticks.
  - `locations.py`: Saved geofenced environments (Home, Office, College, etc.).
- `app/schemas/`: Pydantic models for request parsing and response contracts.
- `app/models/`: Database entities and SQLite schema definitions.
- `app/repositories/`: Pure SQL query abstractions and persistence layer.
- `app/services/`: Application workflows orchestrating data access, formulas, and caching.
- `app/integrations/`: External adapters (`openaq/` HTTP client, `cache/` spatial memory cache).
- `app/dependencies/`: Shared FastAPI dependency injection (`auth.py`, `openaq_api.py`).
- `app/db/`: SQLite connection pool context manager and schema initialization.
- `tests/`: Automated unit and integration test suite (`test_core.py`, `test_services.py`, `test_routes.py`).

## Quick Start

### 1. Set Up Environment
```bash
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
OPENAQ_API_KEY=your_openaq_api_key_here
PORT=8000
HOST=0.0.0.0
DB_PATH=airdose.db
```

### 3. Run Dev Server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger documentation is available at: `http://localhost:8000/docs`

### 4. Run Test Suite
```bash
python -m unittest discover tests
```
