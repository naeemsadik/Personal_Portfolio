# Naeem Abdullah Sadik — Portfolio

A production-grade personal portfolio + admin panel, built as two services:

- **`frontend/`** — Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui, Three.js)
- **`backend/`** — FastAPI + SQLAlchemy + SQLite/MySQL (auth, content CRUD, blog, messages, analytics, uploads)

The two services communicate over HTTP. The frontend also ships a static fallback for every resource so the site stays fully renderable when the backend is offline.

---

## Quick start (local dev)

Open two terminals.

### 1) Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -e .

# Auto-creates SQLite at backend/.data/portfolio.db, runs migrations via create_all,
# and seeds the admin user + initial content from backend/seed-data/*.json.
python -m app.seed

uvicorn app.main:app --reload --port 8000
```

Backend is now serving at <http://localhost:8000> (docs at <http://localhost:8000/docs>).

The seeded admin credentials come from `backend/.env` (copy from `.env.example`):

```
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=change-me-on-first-login
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local       # then edit NEXT_PUBLIC_API_URL if needed

npm run dev                      # http://localhost:3000
```

Default `frontend/.env.local`:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
API_INTERNAL_URL=http://localhost:8000
```

Visit <http://localhost:3000> for the public site, <http://localhost:3000/admin/login> for the admin panel.

---

## Switching to MySQL (production)

By default the backend uses a local SQLite file at `backend/.data/portfolio.db` so you can boot the project without any external database. For production, set `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:3306/portfolio
```

The schema is bootstrapped by `Base.metadata.create_all` (called from `app.prestart` on every container start, plus the uvicorn startup hook as a safety net). Alembic migrations are not used — the SQLAlchemy models are the single source of truth. Then run the seed:

```bash
cd backend
python -m app.seed          # loads admin user + initial content
```

---

## Project layout

```
.
├── README.md                       # you are here
├── data.md                         # CV used to seed initial content
├── frontend/                       # Next.js app (see frontend/README.md)
└── backend/                        # FastAPI service (see backend/README.md)
```

See:

- `frontend/README.md` — Next.js structure, admin pages, fallback content
- `backend/README.md` — API endpoints, models, migrations, seed data

---

## What's seeded on first boot

- **Admin user** — from `ADMIN_BOOTSTRAP_*` env vars.
- **Hero / Settings** — from `backend/seed-data/{hero,settings}.json`.
- **Experience** — 12 entries (UIU BSc, JudgeX, Boikothok, Robohub BD, UIU Computer Club, CSE Fest, Finance Forum, C-Structure, leadership roles, achievements).
- **Projects** — 5 (JudgeX, Boikothok, Robohub BD, C-Structure, UIU Computer Club).
- **Blog** — 2 published posts ("Hello, world" + "How JudgeX Sandboxes Untrusted Code").

Edit the JSON files in `backend/seed-data/` and re-run `python -m app.seed` to refresh.

---

## Deployment (overview)

- **Frontend → Vercel**: import the repo, set the project root to `frontend/`, set the env vars from `frontend/.env.example`. Vercel will detect Next.js automatically.
- **Backend → any host with MySQL + a persistent disk** (Railway, Fly.io, a small VPS, Coolify): `pip install -e .`, run `python -m app.prestart && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8080`. The prestart step runs `Base.metadata.create_all` to bootstrap the schema (idempotent). Mount the `backend/uploads` directory to a persistent volume so image uploads survive restarts.