import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { fail } from "../lib/response";
import { queryOne } from "../db";
import type { AuthContext } from "../types/express";

interface JwtClaims {
  sub: string;
  account_id: string;
  property_id: string;
  role: AuthContext["role"];
  iat?: number;
  exp?: number;
}

const BEARER_PREFIX = "Bearer ";

function parseBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

export function signAccessToken(payload: Omit<JwtClaims, "iat" | "exp">): { token: string; expiresAt: string } {
  const ttlHours = config.ACCESS_TOKEN_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const token = jwt.sign(payload, config.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: `${ttlHours}h`,
  });

  return { token, expiresAt };
}

async function verifyPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `
    SELECT p.id
    FROM properties p
    JOIN team_members tm
      ON tm.account_id = p.account_id
      AND tm.user_id = $1
      AND tm.status = 'accepted'
      AND tm.deleted_at IS NULL
    WHERE p.id = $2
      AND p.deleted_at IS NULL
    LIMIT 1
    `,
    [userId, propertyId],
  );

  return Boolean(row);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = parseBearer(req);
  if (!token) {
    fail(res, "UNAUTHORIZED", "Missing Bearer token.", 401);
    return;
  }

  let claims: JwtClaims;
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    claims = decoded as JwtClaims;
  } catch {
    fail(res, "UNAUTHORIZED", "Invalid or expired token.", 401);
    return;
  }

  if (!claims.sub || !claims.account_id || !claims.property_id || !claims.role) {
    fail(res, "UNAUTHORIZED", "Token is missing required claims.", 401);
    return;
  }

  const requestedProperty = req.header("x-property-id");
  let effectivePropertyId = claims.property_id;

  if (requestedProperty && requestedProperty !== claims.property_id) {
    const hasAccess = await verifyPropertyAccess(claims.sub, requestedProperty);
    if (!hasAccess) {
      fail(res, "FORBIDDEN", "No access to requested property.", 403);
      return;
    }
    effectivePropertyId = requestedProperty;
  }

  req.auth = {
    userId: claims.sub,
    accountId: claims.account_id,
    propertyId: effectivePropertyId,
    role: claims.role,
  };

  next();
}
