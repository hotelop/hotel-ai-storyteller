export interface CursorToken {
  value: string | number | null;
  id: string;
}

export function encodeCursor(token: CursorToken): string {
  return Buffer.from(JSON.stringify(token), "utf-8").toString("base64url");
}

export function decodeCursor(value: string | undefined): CursorToken | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("id" in parsed) || typeof parsed.id !== "string") return null;
    if (!("value" in parsed)) return null;

    const allowed =
      parsed.value === null ||
      typeof parsed.value === "string" ||
      typeof parsed.value === "number";

    if (!allowed) return null;

    return parsed as CursorToken;
  } catch {
    return null;
  }
}
