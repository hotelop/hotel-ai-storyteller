import { Pool } from "pg";
import { config } from "./config";

const pool = config.DB_DRIVER === "pg"
  ? new Pool({
      connectionString: config.DATABASE_URL ?? undefined,
      max: 20,
    })
  : null;

function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (value instanceof Date) {
    return escapeSqlString(value.toISOString());
  }

  if (Buffer.isBuffer(value)) {
    return `'\\x${value.toString("hex")}'::bytea`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "ARRAY[]";
    }
    return `ARRAY[${value.map((item) => toSqlLiteral(item)).join(", ")}]`;
  }

  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("Cannot serialize non-finite number parameter.");
      }
      return String(value);
    case "bigint":
      return value.toString();
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "string":
      return escapeSqlString(value);
    case "object":
      return `${escapeSqlString(JSON.stringify(value))}::jsonb`;
    default:
      throw new Error(`Unsupported SQL parameter type: ${typeof value}`);
  }
}

function interpolateSql(text: string, params: unknown[]): string {
  return text.replace(/\$(\d+)/g, (token, indexText: string) => {
    const index = Number(indexText) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= params.length) {
      throw new Error(`Missing SQL parameter for token ${token}.`);
    }
    return toSqlLiteral(params[index]);
  });
}

function formatSupabaseError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Unknown Supabase RPC error.";
  }

  const err = payload as Record<string, unknown>;
  const pieces = [err.message, err.details, err.hint].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  return pieces.length > 0 ? pieces.join(" | ") : "Unknown Supabase RPC error.";
}

async function queryViaSupabaseRpc<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = interpolateSql(text, params);
  const response = await fetch(`${config.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: config.SUPABASE_SERVICE_KEY ?? "",
      authorization: `Bearer ${config.SUPABASE_SERVICE_KEY ?? ""}`,
    },
    body: JSON.stringify({ sql }),
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw.length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      if (!response.ok) {
        throw new Error(`Supabase RPC error (${response.status}): ${raw}`);
      }
      throw new Error("Supabase RPC returned non-JSON response.");
    }
  }

  if (!response.ok) {
    throw new Error(
      `Supabase RPC error (${response.status}): ${formatSupabaseError(payload)}`,
    );
  }

  if (payload === null) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  return [payload as T];
}

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  if (config.DB_DRIVER === "pg") {
    const result = await pool!.query<T>(text, params);
    return result.rows;
  }

  return queryViaSupabaseRpc<T>(text, params);
}

export async function queryOne<T = unknown>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

