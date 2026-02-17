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

- `SUPABASE_URL` (e.g. `https://<project-ref>.supabase.co`)
- `SUPABASE_SERVICE_KEY` (service_role key from Supabase Settings -> API)
- `JWT_SECRET`

Optional:
- `PORT`
- `ACCESS_TOKEN_TTL_HOURS`
- `MAGIC_LINK_TTL_MINUTES`
- `DATABASE_URL` or `SUPABASE_DB_URL` (optional fallback for direct `pg` mode)

Note:
- Default mode uses Supabase PostgREST RPC (`exec_sql`) with `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.
- Direct `pg` mode is still available when `DATABASE_URL` or `SUPABASE_DB_URL` is provided.

## Database migration

Apply:

- `supabase/migrations/20260217030000_ui_backend_extension.sql`
- `supabase/migrations/20260217043000_add_exec_sql_rpc.sql`
- `supabase/migrations/20260217093000_refresh_exec_sql_rpc.sql`

This migration is additive and extends existing tables/types.

## Deploy on Render.com

### Render dashboard setup

Create a new **Web Service** from this repo with:

- Runtime: `Node`
- Build Command: `npm ci`
- Start Command: `npm run api:start`
- Health Check Path: `/health`

Set environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- Optional: `ACCESS_TOKEN_TTL_HOURS`, `MAGIC_LINK_TTL_MINUTES`

### `render.yaml` example

```yaml
services:
  - type: web
    name: hotel-ops-api
    env: node
    plan: starter
    autoDeploy: true
    buildCommand: npm ci
    startCommand: npm run api:start
    healthCheckPath: /health
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: ACCESS_TOKEN_TTL_HOURS
        value: "24"
      - key: MAGIC_LINK_TTL_MINUTES
        value: "20"
```
