# ChurnPilot AI

AI-powered customer churn prediction and retention platform that uses machine learning, customer behavior analytics, and LLM-powered recommendations to identify high-risk customers and generate personalized retention strategies.

**Predict customer churn. Understand why. Take the right retention action.**

## Architecture

```
ChurnPilot-AI/
├── frontend/          React + Vite + TypeScript
└── backend/           FastAPI + PostgreSQL + ML
```

| Layer | Stack |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router, Axios, Recharts, Lucide React |
| Backend | Python 3.11+, FastAPI, Pydantic, SQLAlchemy, Alembic |
| Database | PostgreSQL / Supabase |
| ML | pandas, numpy, scikit-learn, XGBoost, SHAP, joblib |

Backend secrets never ship to the browser. The frontend only receives `VITE_API_BASE_URL`.

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (local) or a Supabase project

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL or Supabase connection string (`postgresql+psycopg://user:pass@host:5432/dbname`), then:

```powershell
# Create the database once (psql)
# CREATE DATABASE churnpilot_ai;

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

## Frontend setup

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

## Environment

`backend/.env.example`

- `DATABASE_URL` — SQLAlchemy PostgreSQL URL (`postgresql+psycopg://...`)
- `GEMINI_API_KEY` — server-side only
- `CORS_ORIGINS` — comma-separated browser origins
- `SUPABASE_URL` — optional Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never expose to the frontend

`frontend/.env.example`

- `VITE_API_BASE_URL=http://localhost:8000/api`

## API response shape

```json
{
  "success": true,
  "data": {},
  "message": null
}
```
