# Campus Lost & Found — St. Paul's University

A working implementation of the system described in *Enhancing Campus Security
and Accountability: A Smart Lost and Found System Proposal for St. Paul's
University*. It follows the module breakdown from Section 3.2 of the report:

| Report module                          | Where it lives                                   |
|-----------------------------------------|---------------------------------------------------|
| User Interface Module                   | `frontend/` (React + React Router)                |
| Authentication & Authorization Module   | `backend/auth.js`, `backend/server.js` — `/api/register`, `/api/login`, JWT |
| Database Management Module              | `backend/db.js` — MySQL via `mysql2/promise` connection pool |
| Business Logic Module                   | `backend/matching.js` — `runMatchingEngine()`; claim workflow in `server.js` |
| Notification Module                     | `notifications` table + `/api/notifications`; frontend polls every 15s |
| Admin & User Management Module          | `frontend/src/pages/AdminPage.jsx` + `/api/admin/*` routes |
| Token-of-appreciation feature (§2.4.2)  | Included on the claim form and shown to admins    |

The matching engine is a rule-based keyword/category matcher, matching the
report's "classification engine" concept from the University of Nairobi case
study (§2.1) — when a lost or found item is reported, it's compared against
open items of the opposite type in the same category, and both reporters are
notified of likely matches.

## Stack

- **Backend:** Node.js + Express, **MySQL** via `mysql2/promise` (connection
  pool), `jsonwebtoken` for auth, `bcryptjs` for password hashing — matches
  the technology stack table in §3.3.4 of the report.
- **Frontend:** React 19 + Vite, React Router, plain CSS (no UI kit
  dependency, so there's nothing extra to install or explain in a viva).

## Running it locally

### 1. Start MySQL

You need a MySQL server reachable from the backend. Two options:

**Option A — Docker (easiest):**

```bash
docker compose up -d
```

This starts MySQL 8 with a `lostfound` database and a `lostfound_app` user
already created, matching `backend/.env.example`.

**Option B — a MySQL server you already have installed:**

```sql
CREATE DATABASE lostfound;
CREATE USER 'lostfound_app'@'localhost' IDENTIFIED BY 'lostfound_pass';
GRANT ALL PRIVILEGES ON lostfound.* TO 'lostfound_app'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend

Requires Node.js 18+.

```bash
cd backend
cp .env.example .env    # edit DB_HOST/DB_USER/DB_PASSWORD if yours differ
npm install
npm start
```

This starts the API at `http://127.0.0.1:5001` and creates the four tables
(`users`, `items`, `claims`, `notifications`) automatically on first run if
they don't already exist. Use `npm run dev` instead of `npm start` during
development for auto-restart on file changes.

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

If you deploy the backend somewhere other than `127.0.0.1:5001`, set
`VITE_API_URL` in a `.env` file inside `frontend/` before building.

## Using the app

- **Register** as a student with any university-style email.
- To create an **admin** account, register with the admin code
  `SPU-ADMIN-2025` in the "Staff admin code" field (set your own via the
  `ADMIN_SIGNUP_CODE` environment variable, or edit the default in
  `backend/server.js`, before deploying for real).
- Report a lost or found item from the sidebar. If a plausible match already
  exists (same category, overlapping keywords), both reporters get a
  notification immediately.
- From **Browse items**, anyone can open an item that isn't theirs and file
  a claim with proof of ownership and an optional token of appreciation for
  the finder.
- Admins verify or reject claims from the **Admin dashboard**, which also
  shows the recovery-rate statistics the report's problem statement is built
  around (§1.2).

## Environment variables (`backend/.env`)

| Variable            | Purpose                                      | Default              |
|----------------------|-----------------------------------------------|-----------------------|
| `PORT`               | API port                                      | `5001`                |
| `JWT_SECRET`          | Signs auth tokens — set a real secret in prod | `dev-secret-change-me`|
| `ADMIN_SIGNUP_CODE`   | Code that grants the admin role on register   | `SPU-ADMIN-2025`      |
| `DB_HOST`             | MySQL host                                    | `127.0.0.1`           |
| `DB_PORT`             | MySQL port                                    | `3306`                |
| `DB_USER`             | MySQL user                                    | `lostfound_app`       |
| `DB_PASSWORD`         | MySQL password                                | `lostfound_pass`      |
| `DB_NAME`             | MySQL database name                           | `lostfound`           |

## Notes on scope vs. the written proposal

The proposal (Section 1.4, Scope) frames the *research project* as a review
of manual processes rather than a build. This codebase is the technology
solution described conceptually in Section 2.4 (Conceptual Framework) and
Section 3 (Methodology) — i.e., the system you'd point to as the practical
output of that design work. If your submission requires the two to line up
exactly, you may want to note in your report that the scope was extended
from a process review to include a working prototype.
