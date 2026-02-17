// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { parsePagination, sanitizeSortBy } from "./pagination";

function mockReq(query: Record<string, unknown>): Request {
  return { query } as unknown as Request;
}

describe("pagination helpers", () => {
  it("parses and bounds limit", () => {
    const req = mockReq({ limit: "999", sort_dir: "asc", cursor: "abc" });
    const parsed = parsePagination(req, 20, 100);

    expect(parsed.limit).toBe(100);
    expect(parsed.sortDir).toBe("asc");
    expect(parsed.cursor).toBe("abc");
  });

  it("falls back to defaults", () => {
    const req = mockReq({});
    const parsed = parsePagination(req, 20, 100);

    expect(parsed.limit).toBe(20);
    expect(parsed.sortDir).toBe("desc");
    expect(parsed.cursor).toBeUndefined();
  });

  it("sanitizes sort field", () => {
    expect(sanitizeSortBy("rating", ["created_at", "rating"] as const, "created_at")).toBe("rating");
    expect(sanitizeSortBy("drop table", ["created_at", "rating"] as const, "created_at")).toBe("created_at");
  });
});
