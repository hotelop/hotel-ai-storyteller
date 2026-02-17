import { z } from "zod";

type DbDriver = "pg" | "supabase_rpc";

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(8).default("hotel-ops-dev-secret"),
  ACCESS_TOKEN_TTL_HOURS: z.coerce.number().default(24),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().default(20),
});

const parsed = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL_HOURS: process.env.ACCESS_TOKEN_TTL_HOURS,
  MAGIC_LINK_TTL_MINUTES: process.env.MAGIC_LINK_TTL_MINUTES,
});

const resolvedDatabaseUrl = parsed.DATABASE_URL ?? parsed.SUPABASE_DB_URL ?? null;
const hasSupabaseRpcCreds = Boolean(parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_KEY);

if (!resolvedDatabaseUrl && !hasSupabaseRpcCreds) {
  throw new Error(
    "Missing database configuration. Set DATABASE_URL/SUPABASE_DB_URL or SUPABASE_URL + SUPABASE_SERVICE_KEY.",
  );
}

if (!resolvedDatabaseUrl && parsed.SUPABASE_URL && !parsed.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_KEY for Supabase RPC mode.");
}

if (!resolvedDatabaseUrl && parsed.SUPABASE_SERVICE_KEY && !parsed.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL for Supabase RPC mode.");
}

const dbDriver: DbDriver = resolvedDatabaseUrl ? "pg" : "supabase_rpc";

export const config = {
  ...parsed,
  DB_DRIVER: dbDriver,
  DATABASE_URL: resolvedDatabaseUrl,
  SUPABASE_URL: parsed.SUPABASE_URL ?? null,
  SUPABASE_SERVICE_KEY: parsed.SUPABASE_SERVICE_KEY ?? null,
} as const;

