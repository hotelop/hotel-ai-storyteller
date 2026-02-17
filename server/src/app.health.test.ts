// @vitest-environment node
import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";

let app: Express;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-key";

  const mod = await import("./app");
  app = mod.createApp();
});

describe("API health", () => {
  it("returns service heartbeat", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
