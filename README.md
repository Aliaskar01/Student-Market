# Student Market (Student Marketplace)

A responsive web marketplace prototype built for university students to buy and sell secondhand textbooks, electronics, furniture, clothes, and campus essentials.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router v7
- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic V2, PyJWT, bcrypt
- **Database:** PostgreSQL 16 (via Docker Compose) with automatic startup table creation & safe schema column evolution (`init_database` in `backend/app/main.py`)
- **Reverse Proxy / Deployment Ready:** Relative `/api` requests backed by Vite dev proxy and Nginx (`/api` + `/api/uploads`)

## Core Features Implemented

- **Authentication & Sessions (`/login`, `/register`):**
  - Student registration and login integrated with PostgreSQL (`bcrypt` password hashing + JWT access tokens + DB-backed rotating refresh tokens).
  - Persistent sessions (`Remember me`), active device/session listing, single-session revocation, and Sign Out All Devices.
  - Dedicated `validate_registration_email()` validator (`backend/app/auth/validators.py`) accepting any valid email format by default, configurable via `ALLOWED_EMAIL_DOMAINS` for stricter university-only rules later.
  - Keycloak OIDC readiness via `AUTH_PROVIDER=local|keycloak` (`backend/app/auth/providers.py`) and `student.auth_provider` / `student.external_subject_id`.
- **Role & Access Control:**
  - Guests can browse, search, filter, sort, and view listing details.
  - Unauthenticated users cannot create/edit/delete listings, manage profile, save favorites, report listings, or view seller contact details (`401` on backend, `/login` redirect on frontend).
  - Ownership checks (`403`) enforce that sellers can only modify or delete their own listings and photos.
- **Marketplace Flows:**
  - Category browsing (auto-seeded: `Books`, `Electronics`, `Furniture`, `Clothes`, `Other`)
  - Keyword search, price range filter, condition filter, and price/date sorting (`newest`, `price_asc`, `price_desc`)
  - Create & edit listings with real multi-photo uploads (`/api/listings/{id}/photos`), status management (`Active`, `Draft`, `Sold`), seller contact reveal, saved favorites (`/favorites`), and listing reports
  - Mobile & desktop responsive UI (mobile hamburger navigation, collapsible mobile filter drawer, touch-friendly forms)

## Database Tables (Auto-Created on Startup)

1. `student` — Student accounts, credentials (`password_hash`), contact info (`telegram_handle`, `phone_number`), and SSO fields (`auth_provider`, `external_subject_id`).
2. `category` — Marketplace categories (auto-seeded if empty).
3. `listing` — Product listings (`Active`, `Draft`, `Sold`).
4. `listing_photo` — Ordered photos attached to listings (`(listing_id, position)` unique).
5. `user_session` — Hashed refresh tokens, user-agent/IP metadata, expiration, and revocation timestamps.
6. `favorite` — Saved listings per student (`(student_id, listing_id)` unique).
7. `listing_report` — Moderation reports filed by authenticated students.

## Running with Docker Compose

```bash
docker compose up --build
```

- Frontend (PC & mobile on same LAN): `http://localhost:3000` (or `http://<your-pc-lan-ip>:3000`)
- Backend API & Swagger docs: `http://localhost:8000/docs`

### Switching to Keycloak Later

Set the backend environment variables in `docker-compose.yml` or your deployment environment:

```env
AUTH_PROVIDER=keycloak
KEYCLOAK_SERVER_URL=https://auth.your-domain.com
KEYCLOAK_REALM=student-market
KEYCLOAK_CLIENT_ID=student-market-web
```

### Enforcing University Email Domains Later

Set `ALLOWED_EMAIL_DOMAINS` (comma-separated domains or suffixes) or customize `validate_registration_email` in `backend/app/auth/validators.py`:

```env
ALLOWED_EMAIL_DOMAINS=.edu,.edu.kz,kbtu.kz
```

## Running Tests

Backend API & database tests (SQLite in-memory/temp DB):

```bash
cd backend
python -m pytest tests/test_api.py -v
```

Frontend type-check & production bundle check:

```bash
cd frontend
npm run build
```
