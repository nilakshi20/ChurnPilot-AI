# ChurnPilot AI

**Predict customer churn. Understand why. Take the right retention action.**

ChurnPilot AI is a B2B SaaS application that scores every customer for churn risk with a trained
gradient-boosting model, explains each score with per-customer feature contributions, quantifies the
revenue exposed by that risk, and drafts a retention play and outreach message for the accounts worth
saving first. Every number in the UI is calculated by the backend — nothing in the dashboard is hardcoded.

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Database setup](#database-setup)
- [Environment variables](#environment-variables)
- [Migrations](#migrations)
- [Demo data](#demo-data)
- [Machine learning](#machine-learning)
- [Scoring definitions](#scoring-definitions)
- [Retention agent](#retention-agent)
- [CSV upload format](#csv-upload-format)
- [API endpoints](#api-endpoints)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)

## Architecture

```
ChurnPilot-AI/
├── frontend/     React + Vite + TypeScript single-page app
├── backend/      FastAPI application, ML pipeline, Alembic migrations
└── docker-compose.yml
```

The browser only ever talks to FastAPI. PostgreSQL credentials, the Supabase service role key, and the
Gemini API key stay server-side.

```
React (Axios)
   ↓  HTTP, /api/*
FastAPI routes  →  Pydantic schemas
   ↓
Services  ──→ PostgreSQL (SQLAlchemy repositories)
          ──→ ML pipeline (XGBoost + SHAP, joblib artifacts)
          ──→ Gemini (retention strategies, message drafts, insight narration)
```

Request flow for a scored view: routes call a service, the service asks
`app/services/snapshot.py` for the current scored-customer snapshot, and the snapshot either serves a
cached in-memory result (120s TTL, single-flight rebuild) or rebuilds it by loading features from
PostgreSQL and scoring them with the trained model.

### Backend layout

| Path | Responsibility |
| --- | --- |
| `app/main.py` | App factory, CORS, exception handlers, router mounting |
| `app/api/routes/` | HTTP endpoints, one module per domain |
| `app/core/` | Config, logging, response envelope, errors, risk/priority/revenue rules |
| `app/db/models/` | SQLAlchemy models |
| `app/db/repositories/` | Query objects for customers, predictions, retention, messages |
| `app/schemas/` | Pydantic request/response contracts |
| `app/services/` | Business logic: scoring, analytics, insights, retention, CSV, demo, snapshot cache |
| `app/ml/` | Feature definitions, dataset loading, training, evaluation, prediction, explanation |
| `alembic/` | Migration history |
| `scripts/` | `generate_demo_data.py`, `train_model.py` |
| `models/` | Serialized model plus `metrics.json` and `metadata.json` |
| `tests/` | Pytest suite |

### Frontend layout

| Path | Responsibility |
| --- | --- |
| `src/pages/` | One component per route |
| `src/layouts/`, `src/components/layout/` | App shell, sidebar, top bar |
| `src/components/ui/` | Buttons, cards, tables, modals, tabs, tooltips, badges, states |
| `src/charts/` | Recharts wrappers with a shared frame and empty states |
| `src/services/` | Axios client and the typed ChurnPilot API layer |
| `src/hooks/` | Data-fetching hooks with loading/error/refetch handling |
| `src/contexts/` | Toasts, workspace settings, data-version invalidation |
| `src/types/api.ts` | TypeScript mirror of the backend schemas |

### Database schema

`customers` is the parent of `transactions`, `customer_activity`, `support_events`,
`churn_predictions`, `retention_recommendations`, and `generated_messages`. A
`generated_messages` row may also reference the `retention_recommendations` row it came from. All
tables carry UUID primary keys and created/updated timestamps.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS, React Router 7, Axios, Recharts, Lucide React |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, httpx |
| Database | PostgreSQL 14+ or Supabase |
| ML | pandas, numpy, scikit-learn, XGBoost, SHAP, joblib |
| LLM | Google Gemini via the Generative Language REST API |

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (local, Docker, or a Supabase project)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) — optional; without it
  the app falls back to rule-based retention output

## Quick start

```powershell
# 1. Database (Docker option)
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then fill in DATABASE_URL and GEMINI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
copy .env.example .env
npm install
npm run dev
```

Then open <http://localhost:5173>, and click **Load Demo Data**. That one action generates 1,200
synthetic customers with their transactions, activity, and support history, trains a model on them,
and scores every customer — after which the dashboard, customers, segments, insights, and retention
pages all have data.

Useful URLs:

- App: <http://localhost:5173>
- API docs (Swagger): <http://localhost:8000/docs>
- Health: <http://localhost:8000/api/health>

## Database setup

### Option A — Docker

`docker-compose.yml` starts PostgreSQL 17 with database `churnpilot_ai` and user/password
`postgres`/`postgres`, published on host port **5433** so it does not collide with a system PostgreSQL
service on 5432:

```powershell
docker compose up -d
# DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5433/churnpilot_ai
```

### Option B — Local PostgreSQL install

If you already have PostgreSQL installed and would rather not use Docker, run a separate cluster for
this project on its own port:

```powershell
$pg = "C:\Program Files\PostgreSQL\17\bin"
$data = "$env:LOCALAPPDATA\churnpilot-pg\data"
& "$pg\initdb.exe" -D $data -U churnpilot --auth-local=trust --auth-host=trust -E UTF8
& "$pg\pg_ctl.exe" -D $data -l "$env:LOCALAPPDATA\churnpilot-pg\server.log" -o "-p 5433" start
& "$pg\createdb.exe" -h 127.0.0.1 -p 5433 -U churnpilot churnpilot_ai
# DATABASE_URL=postgresql+psycopg://churnpilot@127.0.0.1:5433/churnpilot_ai
```

### Option C — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database**, copy the connection string and convert it to the psycopg
   driver form:
   `postgresql+psycopg://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
   For IPv4-only networks or serverless hosts, use the pooler host on port 6543 instead.
3. Put that value in `DATABASE_URL`. Optionally set `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` if you later add Supabase Auth or Storage.
4. Run `alembic upgrade head` — the app owns its schema through Alembic, so do not create tables by
   hand in the Supabase SQL editor.

The service role key must never reach the browser. Only `VITE_API_BASE_URL` is exposed to the frontend.

## Environment variables

`backend/.env`

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | SQLAlchemy URL, `postgresql+psycopg://user:pass@host:port/db` |
| `GEMINI_API_KEY` | No | empty | Enables AI retention strategies, message drafts, and AI insights. Without it those features fall back to deterministic rules |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Primary Generative Language model id |
| `GEMINI_FALLBACK_MODELS` | No | `gemini-3.5-flash,gemini-3.1-flash-lite` | Comma-separated models tried when the primary is quota-limited or retired |
| `GEMINI_TIMEOUT_SECONDS` | No | `30` | Per-request timeout |
| `GEMINI_MAX_ATTEMPTS` | No | `3` | Retries for transient 429/5xx responses |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed browser origins |
| `SUPABASE_URL` | No | empty | Only needed if you add Supabase Auth/Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | No | empty | Server-side only, never expose |
| `MODEL_DIR` | No | `backend/models` | Where model artifacts are read and written |
| `DEMO_SEED` | No | `42` | Demo generator seed, keeps demo data reproducible |
| `DEMO_CUSTOMER_COUNT` | No | `1200` | Customers created by the demo loader |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `SQL_ECHO` | No | `false` | Log every SQL statement. Verbose; development only |
| `DEBUG` | No | `true` | FastAPI debug flag |

`frontend/.env`

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000/api` | Base URL of the FastAPI API |

Only variables prefixed `VITE_` are readable by the browser bundle. Never put a secret in
`frontend/.env`.

### Which keys do you actually need?

- **To run the app with demo data:** `DATABASE_URL` and `VITE_API_BASE_URL`. Nothing else.
- **To get AI retention strategies, AI message drafts, and AI insights:** add `GEMINI_API_KEY`.
- **Only if you extend the app with Supabase Auth or Storage:** `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.

## Migrations

```powershell
cd backend
alembic upgrade head            # apply all migrations
alembic downgrade -1            # roll back one
alembic current                 # show applied revision
alembic revision --autogenerate -m "describe change"
```

Current revisions:

| Revision | Contents |
| --- | --- |
| `0001_initial_schema` | All seven tables with relationships, indexes, and check constraints |
| `0002_retention_message_fields` | Adds message tone, widens channel constraint, adds the retention `payload` JSONB column |

## Demo data

The demo generator is fully synthetic and reproducible from `DEMO_SEED`. It builds latent behavioural
traits per customer (engagement, inactivity, support pain, payment stress, discount dependence), draws
a churn outcome from those traits, and then emits transactions, activity, and support events that
genuinely reflect them — orders and logins accumulate while the account is engaged and stop once it
goes quiet. That is what makes the data learnable rather than noise.

Load it from the UI with **Load Demo Data**, from the API, or from the CLI:

```powershell
# API: wipes operational data, regenerates, retrains, and rescores
curl -X POST http://localhost:8000/api/demo/load

# CLI: generate and persist only
cd backend
python scripts\generate_demo_data.py --count 1200 --seed 42
```

Demo data is labelled as synthetic in the UI. It is not real customer data and must not be presented
as production numbers.

## Machine learning

Pipeline: load rows → build features → stratified train/test split → median imputation →
standard scaling → XGBoost (`RandomForestClassifier` fallback if XGBoost is unavailable) → evaluation
→ joblib serialization.

Twelve features, all derived from stored events rather than entered by hand:

`tenure_months`, `monthly_spend`, `total_orders`, `average_order_value`, `days_since_last_order`,
`purchase_frequency`, `support_tickets`, `complaint_count`, `discount_usage`, `email_engagement`,
`login_frequency`, `payment_failures`

Train from whatever is currently in the database:

```powershell
cd backend
python scripts\train_model.py
```

Artifacts are written to `backend/models/`: `churn_model.joblib` (pipeline plus metadata),
`metrics.json` (full evaluation including the confusion matrix), and `metadata.json` (version and
headline metrics). Metrics are always computed on a held-out test split and are never hardcoded — the
values surfaced at `/api/settings` and on the Settings page are read from these files.

Explainability uses SHAP where the estimator supports it, falling back to native per-prediction
contributions and then to global feature importances. The UI always words these as
"Factors contributing to this model prediction" and never claims a feature *caused* churn.

## Scoring definitions

**Risk levels** (`app/core/risk.py`) — single source of truth, also exposed at `/api/settings`:

| Level | Churn probability |
| --- | --- |
| Low | `< 0.25` |
| Medium | `0.25 – 0.49` |
| High | `0.50 – 0.74` |
| Critical | `>= 0.75` |

**Revenue at risk** (`app/core/revenue.py`) — `monthly_spend × churn_probability`, annualized by
×12. Aggregated by segment, by risk category, and for high-value customers. Every one of these is
an estimate and is labelled as such in the UI.

**Priority score** (`app/core/priority.py`) — a transparent weighted blend, not a model output:

```
priority = 0.45 × churn_probability
         + 0.25 × customer_value_score        (spend vs. the high-value benchmark)
         + 0.15 × revenue_contribution_score  (share of total monthly revenue)
         + 0.15 × retention_opportunity       (probability × value, discounted if inactive)
```

Levels: low `< 0.25`, medium `< 0.50`, high `< 0.75`, urgent `>= 0.75`.

**Segments** (`app/services/scoring.py`) are assigned by priority order: support-frustrated, inactive,
new, high value / high risk, high value / low risk, low value / high risk, loyal, then steady.

## Retention agent

Gemini is called only from FastAPI, never from the browser. The service receives the customer profile,
value, churn probability, model risk factors, recent activity, purchase behaviour, support history, and
segment, and must return JSON:

```json
{
  "strategy": "...",
  "priority": "low | medium | high | urgent",
  "reasoning": "...",
  "recommended_action": "discount | outreach | product_education | winback | pause_plan | upgrade",
  "channel": "email | whatsapp | sms | sales_call",
  "incentive": null
}
```

Safety and robustness:

- Output is validated with Pydantic; enum-like fields are normalized, and unknown values are coerced
  to a safe default.
- Fenced or prose-wrapped JSON is extracted; reasoning models that emit thought parts before the
  answer are handled.
- The API key travels in the `x-goog-api-key` header rather than the query string, so it never appears
  in request logs.
- Transient 5xx responses are retried with exponential backoff and jitter.
- Free-tier quotas are per model and small (`gemini-3.6-flash` allows 20 requests per day), so a
  quota-exhausted or retired model falls through to the next id in `GEMINI_FALLBACK_MODELS` before the
  request is given up on.
- Any remaining failure falls back to deterministic rules, and the response records
  `source: "rules_fallback"` so the UI can distinguish it from `source: "gemini"`.
- The prompt forbids inventing customer facts and forbids causal claims about churn.

Message generation supports `email`, `whatsapp`, `sms`, and `sales_call` in `professional`, `friendly`,
`concise`, and `premium` tones. SMS and WhatsApp drafts carry no subject line. **Every message is
stored as an editable draft with `send_status: "not_sent"`. The application never sends
communications.**

## CSV upload format

`POST /api/upload/csv` validates first and only writes when you pass `?persist=true`.

Required columns: `email`, `signup_date`, `monthly_spend`.
Optional columns: `first_name`, `last_name`, `company`, `plan`, `status`, `country`, `billing_interval`.

Validated: missing required columns, malformed rows, unparseable dates, non-numeric spend, negative
values, invalid email format, duplicate emails inside the file, emails already in the database, and
allowed values for `plan` / `status` / `billing_interval`. The response returns row counts, per-row
issues with row numbers and field names, and a preview of the first ten rows.

## API endpoints

All responses use one envelope:

```json
{ "success": true, "data": {}, "message": null, "error_code": null }
```

```json
{ "success": false, "data": null, "message": "Customer not found", "error_code": "CUSTOMER_NOT_FOUND" }
```

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service and database status |
| GET | `/api/settings` | Risk thresholds, model info, platform defaults |
| GET | `/api/dashboard/summary` | Headline metrics, risk distribution, churn trend |
| GET | `/api/customers` | Paginated list with search, sort, and risk/segment/high-value/status filters |
| GET | `/api/customers/{id}` | Full customer detail |
| GET | `/api/customers/{id}/prediction` | Churn probability, risk level, model version |
| GET | `/api/customers/{id}/risk-factors` | Ranked model contributions with disclaimer |
| GET | `/api/customers/{id}/retention` | Stored retention recommendations |
| POST | `/api/customers/{id}/generate-retention` | Generate a retention strategy |
| POST | `/api/customers/{id}/generate-message` | Generate a message draft for a channel and tone |
| GET | `/api/segments` | Segment rollups with counts, churn, revenue, revenue at risk |
| GET | `/api/insights` | Calculated analytics plus separately-sourced AI recommendations |
| GET | `/api/analytics/churn` | Churn by segment, plan, tenure band, spend band, engagement, support |
| GET | `/api/analytics/revenue-risk` | Revenue exposure by segment and risk category |
| POST | `/api/upload/csv` | Validate (and optionally persist) a customer CSV |
| POST | `/api/demo/load` | Load demo data, retrain, and rescore |
| POST | `/api/predictions/run` | Rescore all customers with the current model |

Interactive documentation lives at `/docs`.

## Testing

```powershell
cd backend
pytest                       # unit and API tests, no database required
pytest -q tests\test_risk.py # a single module
```

Covered: health endpoint, customer list/detail responses, risk thresholds, revenue-at-risk maths,
priority scoring, CSV validation, prediction response shape and disclaimer wording, Gemini output
schema validation including malformed payloads and blocked prompts, and the Gemini retry/backoff
behaviour on transient 429/5xx responses.

With the backend running and demo data loaded, the smoke test exercises every endpoint including the
live Gemini calls, and reports status plus latency per call:

```powershell
cd backend
python scripts\smoke_test_api.py
```

Frontend type checking and production build:

```powershell
cd frontend
npm run build     # runs tsc --noEmit, then vite build
```

## Deployment

### Frontend on Vercel

1. Import the repository and set **Root Directory** to `frontend`.
2. Build command `npm run build`, output directory `dist`.
3. Environment variable `VITE_API_BASE_URL=https://<your-backend-host>/api`.
4. `frontend/vercel.json` already rewrites all paths to `index.html` so single-page-app deep links
   resolve.
5. Add the resulting Vercel domain to the backend's `CORS_ORIGINS`.

### Backend on a container host

Render, Railway, Fly.io, or any Docker host works. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Checklist:

- Set `DATABASE_URL`, `GEMINI_API_KEY`, and `CORS_ORIGINS` (your Vercel domain) as secrets.
- Run `alembic upgrade head` as a release/pre-deploy step.
- Set `DEBUG=false` in production.
- `backend/models/` must contain a trained model, or call `POST /api/predictions/run` after a training
  run. On ephemeral filesystems, either bake artifacts into the image or point `MODEL_DIR` at
  persistent storage — otherwise a redeploy loses the trained model.
- Use a pooled connection string for serverless or autoscaling hosts.

## Security

- The browser never holds a database credential, service role key, or LLM key. All secrets are
  server-side, and only `VITE_`-prefixed values are bundled.
- Gemini is reachable only through FastAPI.
- CORS is an explicit allow-list from `CORS_ORIGINS`.
- All request bodies, query parameters, and LLM responses are validated with Pydantic.
- Database access goes through SQLAlchemy with bound parameters.
- The global exception handler returns the standard envelope with a stable `error_code` and does not
  leak stack traces to clients.
- Generated messages are drafts. There is no send path, so a bad LLM output cannot reach a customer.
- `.env` files are git-ignored; `.env.example` documents the shape without values.

**Not yet implemented, and required before exposing this to real users:** authentication,
authorization, multi-tenancy, rate limiting, and audit logging. See below.

## Known limitations

- **No authentication or multi-tenancy.** Every endpoint is public and the workspace is single-tenant.
  Do not deploy to a public URL with real data as-is.
- **No rate limiting**, including on the endpoints that call Gemini.
- **Model quality depends entirely on your data.** Metrics shipped in `backend/models/` come from the
  synthetic demo dataset and are not a claim about real-world accuracy. Retrain on your own history
  before trusting a score.
- **Risk bands look bimodal on the demo dataset.** Because the model separates the synthetic data
  well, most customers land in Low or Critical and the Medium/High bands stay sparse. That is honest
  model output rather than a UI bug, but it does mean the demo does not exercise the middle bands much.
  Probability calibration would spread the distribution more evenly.
- **`is_churned` is derived from `status == "churned"`**, so the model learns your current labelling
  convention, including any post-churn inactivity in the features. A production setup should label
  churn as of a cutoff date and compute features only from before it.
- **Cold analytics requests take a couple of seconds** on ~1,200 customers with ~115k events, because
  the scored snapshot has to be rebuilt and every customer rescored. Warm requests are sub-100ms via a
  120-second in-memory cache.
- **The snapshot cache is per-process and in-memory**, so multiple workers each keep their own copy
  and can briefly disagree after a write.
- Predictions are recomputed in a blocking request rather than a background job, so `POST /api/demo/load`
  and `POST /api/predictions/run` are long-running calls.
- Workspace settings (business name, currency, tone) persist in browser local storage, not the database.
- CSV import creates customers only; it does not import transactions, activity, or support history.
- SHAP is computed per request for the customer being viewed rather than precomputed in batch.
- No frontend unit or end-to-end test suite; the frontend is verified by type checking, a production
  build, and manual browser passes.
- No CI pipeline is configured.

## Future improvements

- Authentication, organizations, and role-based access, with per-tenant data isolation.
- Move training, scoring, and demo loading to a task queue with progress reporting.
- Persist workspace settings and risk thresholds server-side per tenant.
- Replace the in-process snapshot cache with Redis, and precompute analytics aggregates in SQL.
- Point-in-time churn labelling with a proper feature cutoff, plus model monitoring for drift and
  calibration.
- Batch SHAP precomputation and cohort-level explanations.
- Real outreach integrations (email, WhatsApp, CRM) behind an explicit human approval step and an
  audit log.
- Rate limiting and per-tenant quotas on LLM-backed endpoints.
- Full CSV import for transactions, activity, and support events, plus scheduled syncs.
- Frontend test suite and a CI pipeline running pytest, type checking, and the build on every push.
