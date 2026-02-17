import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8).default("hotel-ops-dev-secret"),
  ACCESS_TOKEN_TTL_HOURS: z.coerce.number().default(24),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().default(20),
});

export const config = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL_HOURS: process.env.ACCESS_TOKEN_TTL_HOURS,
  MAGIC_LINK_TTL_MINUTES: process.env.MAGIC_LINK_TTL_MINUTES,
});
