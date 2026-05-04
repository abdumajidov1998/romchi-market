# Romchi Market

Two-module project:

- **`backend-java/`** — Spring Boot 4 REST API (Java 25, Maven). JWT auth,
  SMS verification (Eskiz.uz), file uploads, JPA + Postgres/H2.
- **`frontend/`** — Next.js 16 (React 19, Tailwind 4). All UI lives here.

## Local development

```bash
# Terminal 1 — backend (H2 file db, dev profile)
cd backend-java
./mvnw spring-boot:run        # http://localhost:3001

# Terminal 2 — frontend
cd frontend
npm install                   # first time
npm run dev                   # http://localhost:3000
```

The frontend rewrites `/api/*` and `/uploads/*` to `BACKEND_ORIGIN`
(`http://localhost:3001` by default), so client `fetch('/api/...')`
calls reach the Java backend transparently in both dev and prod.

## Deployment

Each module has its own `Dockerfile`. The `render.yaml` at the repo root
provisions a Postgres database plus two Render services
(`romchi-backend` and `romchi-frontend`) wired together via
`BACKEND_ORIGIN` and `ALLOWED_ORIGINS`. The top-level `Dockerfile` is a
shortcut that builds only the backend image — useful for single-service
hosts.

## Environment

Backend: see `backend-java/.env.example`. Required in prod:

- `JWT_SECRET` — 32+ char random string
- `DATABASE_URL` — `jdbc:postgresql://…` or use the `dev` profile for H2
- `ALLOWED_ORIGINS` — comma-separated list of allowed frontend URLs
- `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` — for live SMS (omit to log codes to
  console in dev)
- `ADMIN_PHONES` — comma-separated phones that get the admin role

Frontend: only `BACKEND_ORIGIN` (default `http://localhost:3001`).
