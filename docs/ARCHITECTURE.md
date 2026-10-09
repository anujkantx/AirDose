# AirDose System Architecture

AirDose is a personal air-pollution exposure dosimeter that calculates inhaled particulate mass ($\mu\text{g}$ PM2.5) by combining real-time spatio-temporal air telemetry, physical exertion respiration rates, and micro-environment infiltration factors.

---

## 1. High-Level Request & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                   │
│   Dashboard UI  •  Sensors (GPS/Motion)  •  Live Ticker│
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON / Bearer JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│               API Layer (FastAPI Routers)              │
│    /api/auth  •  /api/air-quality  •  /api/exposure    │
└───────────────────────────┬────────────────────────────┘
                            │ Validated Schemas
                            ▼
┌────────────────────────────────────────────────────────┐
│               Service Orchestration Layer              │
│    ExposureService  •  AirQualityService  •  UserService│
└───────────────┬─────────────────────────┬──────────────┘
                │                         │
     Scientific Formulas         Persistence & Adapters
                ▼                         ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│          Core Engine          │ │    Data & Storage    │
│ • Exposure Dosimeter Math     │ │ • SQLite Repos       │
│ • Infiltration Factors        │ │ • OpenAQ v3 Client   │
│ • AQI Breakpoint Matrix       │ │ • Spatial Cache      │
└───────────────────────────────┘ └──────────────────────┘
```

---

## 2. Directory Responsibilities

### Backend (`backend/app/`)

| Directory | Responsibility | Invariants / Constraints |
| :--- | :--- | :--- |
| `routers/` | HTTP status codes, query/body parameter parsing, route dispatch. | No raw SQL queries or mathematical formula implementations. |
| `schemas/` | Pydantic request and response contract validation. | Strict type hints; keeps payload parsing decoupled from database models. |
| `models/` | Database entity definitions. | Represents table structures and foreign key relationships. |
| `services/` | Coordinates multi-step business logic across repositories and core engines. | Does not directly execute raw SQL or handle HTTP request headers. |
| `core/` | Pure domain formulas, physical constants, and scientific conversions. | Zero database or network dependencies. Completely unit-testable. |
| `repositories/` | SQL persistence and data retrieval queries. | Isolates SQLite specifics from service workflows. |
| `integrations/` | External HTTP API clients and in-memory caches. | Encapsulates OpenAQ v3 pagination, headers, and rate limiting. |
| `dependencies/` | FastAPI dependency injection (e.g. JWT extraction, API client injection). | Reusable request-scoped services. |
| `db/` | Connection pooling, transaction context managers, and schema migration. | Guarantees connection rollback on uncaught exceptions. |

### Frontend (`frontend/src/`)

| Directory | Responsibility | Invariants / Constraints |
| :--- | :--- | :--- |
| `app/` | Next.js App Router pages, metadata, layouts, and route handlers. | Kept clean of heavy stateful algorithms. |
| `components/` | Visual UI widgets, charts, tables, and modal dialogs. | Reusable, accessible, and emoji-free (Lucide icons). |
| `lib/` | API communication clients, unit conversion helpers, and distance math. | Framework-agnostic pure TypeScript utilities. |
| `types/` | Shared TypeScript domain contracts. | Single source of truth for frontend entity definitions. |

---

## 3. Major Architectural Decisions

### A. Sub-Microgram Client-Side Ticker with Checkpointed Backend Synchronization
- **Challenge**: An inhalation dosimeter needs to feel continuous and alive (updating every second), but flooding the backend with 1 Hz HTTP requests drains device batteries and saturates server sockets.
- **Solution**: The backend serves as an authoritative checkpoint engine ($>25\text{ m}$ movement or $>60\text{ s}$ elapsed). In between checkpoints, the frontend's local ticker accumulates dosage at the exact calibrated rate:
  $$\text{Rate } (\mu\text{g/s}) = \text{PM}_{2.5} \times I_f \times B_f \times V_E$$
  This delivers instant visual responsiveness with minimal battery and network overhead.

### B. In-Memory Spatio-Temporal Observation Cache
- **Challenge**: OpenAQ v3 rate limits can quickly throttle public demo users.
- **Solution**: The backend implements an in-memory spatial cache indexed by coordinate radius ($1.0\text{ km}$) and observation TTL ($30\text{ minutes}$). Repeated requests within the same neighborhood are resolved in $<2\text{ ms}$ with zero external API calls.

### C. Zero-Dependency Pure Core Math Engine
- All dosimeter math (`exposure.py`), AQI multi-pollutant breakpoints (`aqi.py`), indoor infiltration adjustments (`infiltration.py`), and geofencing (`location_resolver.py`) are implemented without third-party frameworks. They execute in microseconds and are covered by 100% deterministic unit tests in `backend/tests/test_core.py`.
