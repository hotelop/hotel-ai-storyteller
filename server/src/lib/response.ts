import type { Response } from "express";

export interface CursorMeta {
  next_cursor?: string | null;
  has_more?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  [key: string]: unknown;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: CursorMeta | Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: ApiError;
}

export function ok<T>(res: Response, data: T, meta?: ApiSuccess<T>["meta"], status = 200): Response {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  } satisfies ApiSuccess<T>);
}

export function fail(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  } satisfies ApiFailure);
}
