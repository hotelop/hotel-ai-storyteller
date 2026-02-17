import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { fail } from "../lib/response";
import { config } from "../config";
import { signAccessToken } from "../middleware/auth";

const requestMagicLinkSchema = z.object({
  email: z.string().email(),
});

const confirmMagicLinkSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

function nameFromEmail(email: string): { firstName: string; lastName: string | null } {
  const [local] = email.split("@");
  const normalized = local.replace(/[._-]+/g, " ").trim();
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Guest", lastName: null };
  }

  return {
    firstName: parts[0]!.slice(0, 50),
    lastName: parts.length > 1 ? parts.slice(1).join(" ").slice(0, 50) : null,
  };
}

async function ensureUser(email: string): Promise<{ id: string; email: string; first_name: string; last_name: string | null }> {
  const existing = await queryOne<{ id: string; email: string; first_name: string; last_name: string | null }>(
    `SELECT id, email, first_name, last_name FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1`,
    [email],
  );

  if (existing) {
    return existing;
  }

  const name = nameFromEmail(email);
  const created = await queryOne<{ id: string; email: string; first_name: string; last_name: string | null }>(
    `
    INSERT INTO users (email, first_name, last_name)
    VALUES ($1, $2, $3)
    RETURNING id, email, first_name, last_name
    `,
    [email, name.firstName, name.lastName],
  );

  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}

async function ensureMembership(userId: string, email: string): Promise<{ accountId: string; role: "superadmin" | "brand" | "admin" | "creator"; propertyId: string }> {
  const existing = await queryOne<{
    account_id: string;
    role: "superadmin" | "brand" | "admin" | "creator";
    property_id: string;
  }>(
    `
    SELECT
      tm.account_id,
      tm.role,
      COALESCE(up.default_property_id, p.id) AS property_id
    FROM team_members tm
    LEFT JOIN user_preferences up ON up.user_id = tm.user_id
    LEFT JOIN LATERAL (
      SELECT p2.id
      FROM properties p2
      WHERE p2.account_id = tm.account_id AND p2.deleted_at IS NULL
      ORDER BY p2.created_at ASC
      LIMIT 1
    ) p ON TRUE
    WHERE tm.user_id = $1
      AND tm.status = 'accepted'
      AND tm.deleted_at IS NULL
    ORDER BY tm.joined_at NULLS LAST, tm.id
    LIMIT 1
    `,
    [userId],
  );

  if (existing?.property_id) {
    return {
      accountId: existing.account_id,
      role: existing.role,
      propertyId: existing.property_id,
    };
  }

  const accountName = `${email.split("@")[0]} account`;
  const account = await queryOne<{ id: string }>(
    `INSERT INTO accounts (name, is_default, created_by, updated_by) VALUES ($1, TRUE, $2, $2) RETURNING id`,
    [accountName, userId],
  );

  if (!account) {
    throw new Error("Failed to create account");
  }

  const role = "admin" as const;

  await query(
    `
    INSERT INTO team_members (account_id, user_id, role, status, created_by, joined_at)
    VALUES ($1, $2, $3, 'accepted', $2, NOW())
    ON CONFLICT (account_id, user_id) DO NOTHING
    `,
    [account.id, userId, role],
  );

  const property = await queryOne<{ id: string }>(
    `
    INSERT INTO properties (account_id, name, created_by, updated_by)
    VALUES ($1, $2, $3, $3)
    RETURNING id
    `,
    [account.id, "Main Property", userId],
  );

  if (!property) {
    throw new Error("Failed to create default property");
  }

  await query(
    `
    INSERT INTO user_preferences (user_id, default_account_id, default_property_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE
    SET default_account_id = EXCLUDED.default_account_id,
        default_property_id = EXCLUDED.default_property_id,
        updated_at = NOW()
    `,
    [userId, account.id, property.id],
  );

  return {
    accountId: account.id,
    propertyId: property.id,
    role,
  };
}

export const authRouter = Router();

authRouter.post(
  "/v1.0/signin",
  asyncHandler(async (req, res) => {
    const parsed = requestMagicLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const user = await ensureUser(email);

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + config.MAGIC_LINK_TTL_MINUTES * 60 * 1000).toISOString();

    await query(
      `
      INSERT INTO magic_tokens (user_id, email, token, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          token = EXCLUDED.token,
          expires_at = EXCLUDED.expires_at,
          used_at = NULL,
          created_at = NOW()
      `,
      [user.id, email, token, expiresAt],
    );

    res.status(201).json({
      token,
      expires_at: expiresAt,
    });
  }),
);

authRouter.post(
  "/v1.0/signin/confirm",
  asyncHandler(async (req, res) => {
    const parsed = confirmMagicLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const token = parsed.data.token;

    const magic = await queryOne<{ id: string; user_id: string | null; expires_at: string; used_at: string | null }>(
      `
      SELECT id, user_id, expires_at, used_at
      FROM magic_tokens
      WHERE lower(email) = lower($1)
        AND token = $2
      LIMIT 1
      `,
      [email, token],
    );

    if (!magic || magic.used_at !== null || new Date(magic.expires_at).getTime() < Date.now()) {
      fail(res, "INVALID_TOKEN", "Magic link token is invalid or expired.", 401);
      return;
    }

    await query(
      `UPDATE magic_tokens SET used_at = NOW() WHERE id = $1`,
      [magic.id],
    );

    const user = await ensureUser(email);
    const membership = await ensureMembership(user.id, email);

    const session = signAccessToken({
      sub: user.id,
      account_id: membership.accountId,
      property_id: membership.propertyId,
      role: membership.role,
    });

    res.json({
      access_token: session.token,
      token_type: "bearer",
      expires_at: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: [user.first_name, user.last_name].filter(Boolean).join(" "),
        role: membership.role.toUpperCase(),
        status: "ACTIVE",
        is_guest: false,
      },
    });
  }),
);
