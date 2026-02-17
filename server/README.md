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

- `DATABASE_URL`
- `JWT_SECRET`

Optional:
- `PORT`
- `ACCESS_TOKEN_TTL_HOURS`
- `MAGIC_LINK_TTL_MINUTES`

## Database migration

Apply:

- `supabase/migrations/20260217030000_ui_backend_extension.sql`

This migration is additive and extends existing tables/types.
