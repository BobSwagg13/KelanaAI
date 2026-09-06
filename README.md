# KelanaAI

AI-powered travel planning. Drop a pin on a map, set a budget and a travel
style, and get a day-by-day itinerary — plus a chat assistant that answers
travel questions from a curated document library and shows its sources.

- **Plan a trip** — destination, length, budget, month, style and group become a
  day-by-day schedule with costs, a budget breakdown and transport guidance.
- **Ask the assistant** — multi-turn chat grounded in an Amazon Bedrock
  Knowledge Base (visa checklists, customs and payment guides, city guides).
  Every answer lists the passages it was written from.

---

## Architecture

Two independently-run halves:

| | Stack | Runs on |
|---|---|---|
| [`backend/`](backend/) | FastAPI, SQLAlchemy, PostgreSQL, Amazon Bedrock | port 8000 |
| [`frontend/`](frontend/) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 | port 3000 |

**Itinerary generation** is three stages, not one call: an outline call fixes
each day's theme, area, anchors, dinner and evening venue; then day-batches
(5 days each) and the tips/food/budget/transport sections run concurrently
against that outline; the results are merged. This exists because
`amazon.nova-lite-v1:0` emits at most 5,000 output tokens per request — a
single call could not produce a fully-detailed month-long trip. See
[`services/bedrock_service.py`](backend/services/bedrock_service.py).

**The assistant** retrieves passages from the Knowledge Base and then answers
with them prepended, because `retrieve_and_generate` is not offered for managed
knowledge bases. See [`services/kb_service.py`](backend/services/kb_service.py).

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (local) or a [Neon](https://neon.tech) database
- An AWS account with Amazon Bedrock model access for `amazon.nova-lite-v1:0`

---

## Local setup

### 1. Database

```bash
createdb kelana          # or point DATABASE_URL at a Neon database
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # then fill it in — see the table below
uvicorn main:app --reload
```

`init_db()` runs at import and creates any missing tables, so a fresh database
needs nothing else. The scripts in [`backend/migrations/`](backend/migrations/)
are only for evolving an already-populated database — there is no Alembic:

```bash
python migrations/add_conversations_and_messages.py
python migrations/add_conversations_and_messages.py --downgrade
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

---

## Environment variables

### `backend/.env`

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. Neon needs `?sslmode=require`. |
| `AWS_REGION` | yes | Bedrock region, e.g. `ap-southeast-2`. Missing this crashes at import. |
| `MODEL_ID` | yes | Generation model, e.g. `amazon.nova-lite-v1:0`. |
| `AWS_BEARER_TOKEN_BEDROCK` | yes | Bedrock API key. Authorizes `bedrock-runtime` only. |
| `JWT_SECRET_KEY` | yes | Signs session tokens. Use a long random string. |
| `AWS_ACCESS_KEY_ID` | for the assistant | SigV4 credentials. The bearer token above **cannot** call the Knowledge Base APIs. |
| `AWS_SECRET_ACCESS_KEY` | for the assistant | Pairs with the above. |
| `KNOWLEDGE_BASE_ID` | for the assistant | The managed Bedrock Knowledge Base to query. |
| `FRONTEND_URL` | for deploys | Extra CORS origins, comma-separated. Vercel's own `*.vercel.app` hostnames are matched by a regex in `main.py` and don't need listing. |

### `frontend/.env.local`

| Variable | Required | What it's for |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Backend base URL. Defaults to `http://localhost:8000`. |
| `NEXT_PUBLIC_MAP_TILE_URL` | yes | Leaflet tile server URL. |

`NEXT_PUBLIC_*` values are inlined at **build** time — changing one in a hosting
dashboard does nothing until you redeploy.

---

## Commands

```bash
# backend/
uvicorn main:app --reload

# frontend/
npm run dev
npm run build
npm run lint
npm test
npx tsc --noEmit
```

---

## Deployment

The frontend and backend deploy separately and only need to know each other's
URLs.

### Database — Neon

1. Create a project; copy the connection string from **Connection Details**.
2. Set it as `DATABASE_URL`, keeping `?sslmode=require`.
3. Start the backend once — `init_db()` creates the schema.

[`database.py`](backend/database.py) sets `pool_pre_ping` and `pool_recycle`
because Neon drops idle connections and its free tier auto-suspends; without
them the pool hands out a dead socket and the next query fails.

To copy local data up instead of starting empty:

```bash
pg_dump "postgresql://localhost:5432/kelana" --no-owner --no-privileges \
  | psql "<neon-connection-string>"
```

### Backend — FastAPI Cloud

1. Set every `backend/.env` variable in the project's environment settings —
   `.env` is gitignored and is not deployed.
2. Deploy. FastAPI Cloud starts the app with the `fastapi run` CLI, which lives
   in the `fastapi-cli` package — this is why `requirements.txt` pins
   **`fastapi[standard]`** rather than bare `fastapi`. With plain `fastapi` the
   container crash-loops on `RuntimeError: To use the fastapi command, please
   install "fastapi[standard]"` and never passes a readiness probe.

Any other host works the same way, as long as it binds `0.0.0.0:$PORT`.

### Frontend — Vercel

1. Set **Root Directory** to `frontend`.
2. Add `NEXT_PUBLIC_API_URL` (your backend URL, no trailing slash) and
   `NEXT_PUBLIC_MAP_TILE_URL`.
3. Deploy — and redeploy after any change to those variables.

### CORS

The backend only answers browsers whose origin it recognises. `main.py` allows
`http://localhost:3000`, anything in `FRONTEND_URL`, and any
`https://kelana*.vercel.app` hostname. A custom domain must be added via
`FRONTEND_URL`, or every request fails with:

```
blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

---

## API

All endpoints except `/` and `/api/v1/auth/*` require a
`Authorization: Bearer <token>` header, and only ever return the caller's own
rows.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create an account |
| `POST` | `/api/v1/auth/login` | Exchange credentials for a token |
| `GET` | `/api/v1/auth/me` | Current user + profile counters |
| `GET`/`POST` | `/api/v1/trips` | List / create trips |
| `GET`/`PUT`/`DELETE` | `/api/v1/trips/{id}` | Read / update / delete a trip |
| `POST` | `/api/v1/trips/{id}/generate` | Generate or regenerate the itinerary |
| `GET`/`POST` | `/api/v1/conversations` | List / start assistant conversations |
| `GET`/`PATCH`/`DELETE` | `/api/v1/conversations/{id}` | Read / rename / delete |
| `POST` | `/api/v1/conversations/{id}/messages` | Send a message, get a grounded reply |

Interactive docs are at `/docs` when the backend is running.

---

## Repository layout

```
backend/
  main.py            FastAPI app, routes, CORS, auth dependency
  database.py        engine, session factory, init_db()
  models/            SQLAlchemy models (user, trip, conversation, message)
  services/          bedrock_service (itineraries), kb_service (assistant),
                     auth_service, trip_service
  migrations/        one script per schema change; no Alembic
  knowledge/         Knowledge Base tooling and the RAG comparison harness
frontend/
  app/               App Router routes
  components/        providers, layout, form, map, recommendations, assistant
  lib/               api clients, query keys, types, utils
docs/                RAG vs base-model comparison report
```
