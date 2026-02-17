import { z } from "zod";

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

const resolvedDatabaseUrl = parsed.DATABASE_URL ?? parsed.SUPABASE_DB_URL;

if (!resolvedDatabaseUrl) {
  if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Postgres connection string. This API executes SQL directly and needs DATABASE_URL or SUPABASE_DB_URL. SUPABASE_URL/SUPABASE_SERVICE_KEY alone are not enough for pg connections.",
    );
  }

  throw new Error(
    "Missing Postgres connection string. Set DATABASE_URL or SUPABASE_DB_URL.",
  );
}

export const config = {
  ...parsed,
  DATABASE_URL: resolvedDatabaseUrl,
};
