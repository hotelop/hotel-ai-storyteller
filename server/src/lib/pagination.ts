import type { Request } from "express";

export type SortDirection = "asc" | "desc";

export interface ParsedPagination {
  limit: number;
  cursor?: string;
  sortDir: SortDirection;
}

export function parsePagination(req: Request, defaultLimit = 20, maxLimit = 100): ParsedPagination {
  const parsedLimit = Number(req.query.limit);
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(maxLimit, Math.floor(parsedLimit)))
    : defaultLimit;

  const sortDirParam = String(req.query.sort_dir ?? "desc").toLowerCase();
  const sortDir: SortDirection = sortDirParam === "asc" ? "asc" : "desc";

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  return {
    limit,
    cursor,
    sortDir,
  };
}

export function sanitizeSortBy<T extends string>(candidate: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof candidate !== "string") return fallback;
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : fallback;
}
