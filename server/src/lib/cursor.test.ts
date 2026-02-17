// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("cursor helpers", () => {
  it("round-trips a valid cursor", () => {
    const token = { value: "2026-02-17T00:00:00.000Z", id: "abc-123" };
    const encoded = encodeCursor(token);

    expect(typeof encoded).toBe("string");
    expect(decodeCursor(encoded)).toEqual(token);
  });

  it("returns null for malformed cursor", () => {
    expect(decodeCursor("not-base64")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });
});
