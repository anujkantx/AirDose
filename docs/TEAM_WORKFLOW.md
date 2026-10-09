# AirDose Team Workflow & Collaboration Guide

Guidelines for hackathon collaboration, branch management, code review, and ownership.

---

## 1. Branching Strategy

- **`main`**: Production and demo-ready branch. Must always build cleanly and have passing tests.
- **Feature Branches**:
  - `feat/<feature-name>` (e.g. `feat/auto-exertion-mode`, `feat/commute-simulator`)
  - `fix/<bug-name>` (e.g. `fix/gps-drift-filter`)
  - `docs/<doc-name>` (e.g. `docs/api-contracts`)

---

## 2. Feature & Layer Ownership

To prevent teammates from stepping on each other's toes during fast-paced hackathon development:

| Role / Owner | Responsible Files / Directories | Contract Boundaries |
| :--- | :--- | :--- |
| **Dosimeter & Core Engine** | `backend/app/core/`, `backend/tests/test_core.py` | Exposes pure calculation functions. Does not edit frontend components. |
| **API & Services** | `backend/app/routers/`, `backend/app/services/`, `backend/app/repositories/` | Implements endpoint schemas in `app/schemas/`. Agrees on JSON responses with Frontend Lead. |
| **Frontend Dashboard & UI** | `frontend/src/app/`, `frontend/src/components/`, `frontend/src/types/` | Consumes API contracts via `lib/api.ts`. Does not modify backend formulas. |
| **Data & Integrations** | `backend/app/integrations/`, `backend/app/db/` | Manages OpenAQ client, rate limits, caching, and SQLite schema migrations. |

---

## 3. Pre-Commit Validation Checklist

Before pushing any commit or opening a Pull Request, run the local verification suite:

### Backend Checks
```bash
cd backend
# 1. Run all 24 unit tests
python -m unittest discover tests

# 2. Check startup
uvicorn app.main:app --reload --port 8000
```

### Frontend Checks
```bash
cd frontend
# 1. Type check
npx tsc --noEmit

# 2. Production build verification
npm run build
```

---

## 4. Pull Request Rules

1. **Keep PRs Targeted**: Avoid sweeping rewrites in a single PR. Small, reviewable PRs that solve one issue are easy to test and debug.
2. **Preserve API Contracts**: If changing a request/response model, notify the team and update `docs/API.md` and `frontend/src/types/index.ts` in the same PR.
3. **Zero-Emoji UI Rule**: Maintain professional visual polish by using Lucide SVG icons instead of raw emoji characters.
4. **Clean Commits**: Write clear, imperative commit messages (e.g., `feat: implement GPS displacement fallback for stationary speed`).

---

## 5. Demo Emergency Rollback

If an unexpected regression occurs right before a presentation:
```bash
# View recent commits
git log --oneline -n 5

# Revert specific commit safely
git revert <commit-hash>
git push origin main
```
Or check out the known working release tag.
