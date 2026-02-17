# Hotel Ops API

Backend implementation for UI-driven `/v1.0/*` endpoints with:
- custom JWT auth (no Supabase Auth)
- account/property RBAC scoping
- cursor pagination + API envelope
- compatibility support for existing sign-in and `/users/me`

## Run

```bash
cp server/.env.example .env
npm run api:dev
```

## Required env vars

- `DATABASE_URL` or `SUPABASE_DB_URL` (direct Postgres connection string)
- `JWT_SECRET`

Optional:
- `PORT`
- `ACCESS_TOKEN_TTL_HOURS`
- `MAGIC_LINK_TTL_MINUTES`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Note:
- This API uses direct SQL via `pg`, so `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` alone are not sufficient.
- You still need a Postgres connection string (`DATABASE_URL` or `SUPABASE_DB_URL`).

## Database migration

Apply:

- `supabase/migrations/20260217030000_ui_backend_extension.sql`

This migration is additive and extends existing tables/types.
