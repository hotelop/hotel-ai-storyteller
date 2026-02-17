import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { fail, ok } from "../lib/response";

const updateMeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).nullable().optional(),
  preferences: z
    .object({
      theme: z.string().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

async function getCurrentUserContext(userId: string) {
  const row = await queryOne<{
    id: string;
    email: string;
    first_name: string;
    last_name: string | null;
    role: "superadmin" | "brand" | "admin" | "creator";
    created_at: string;
    account_id: string;
    account_name: string;
    pref_theme: string | null;
    pref_language: string | null;
    pref_timezone: string | null;
    property_id: string | null;
  }>(
    `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      tm.role,
      u.created_at,
      a.id AS account_id,
      a.name AS account_name,
      up.theme AS pref_theme,
      up.language AS pref_language,
      up.timezone AS pref_timezone,
      up.default_property_id AS property_id
    FROM users u
    JOIN team_members tm
      ON tm.user_id = u.id
      AND tm.status = 'accepted'
      AND tm.deleted_at IS NULL
    JOIN accounts a ON a.id = tm.account_id
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE u.id = $1
      AND u.deleted_at IS NULL
    ORDER BY tm.joined_at NULLS LAST, tm.id
    LIMIT 1
    `,
    [userId],
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    createdAt: row.created_at,
    account: {
      id: row.account_id,
      name: row.account_name,
    },
    property: row.property_id ? { id: row.property_id } : null,
    preferences: {
      theme: row.pref_theme ?? "light",
      language: row.pref_language ?? "en",
      timezone: row.pref_timezone ?? "UTC",
    },
  };
}

export const usersRouter = Router();

usersRouter.get(
  ["/users/me", "/v1.0/users/me"],
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const context = await getCurrentUserContext(req.auth.userId);
    if (!context) {
      fail(res, "NOT_FOUND", "User not found.", 404);
      return;
    }

    ok(res, context);
  }),
);

usersRouter.patch(
  ["/users/me", "/v1.0/users/me"],
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const payload = parsed.data;

    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      await query(
        `
        UPDATE users
        SET
          first_name = COALESCE($2, first_name),
          last_name = CASE WHEN $3::text IS NULL THEN last_name ELSE $3 END,
          updated_at = NOW(),
          updated_by = $1
        WHERE id = $1
        `,
        [req.auth.userId, payload.firstName ?? null, payload.lastName === undefined ? null : payload.lastName],
      );
    }

    if (payload.preferences) {
      await query(
        `
        INSERT INTO user_preferences (user_id, theme, language, timezone)
        VALUES ($1, COALESCE($2, 'light'), COALESCE($3, 'en'), COALESCE($4, 'UTC'))
        ON CONFLICT (user_id) DO UPDATE
        SET theme = COALESCE($2, user_preferences.theme),
            language = COALESCE($3, user_preferences.language),
            timezone = COALESCE($4, user_preferences.timezone),
            updated_at = NOW()
        `,
        [
          req.auth.userId,
          payload.preferences.theme ?? null,
          payload.preferences.language ?? null,
          payload.preferences.timezone ?? null,
        ],
      );
    }

    const context = await getCurrentUserContext(req.auth.userId);
    if (!context) {
      fail(res, "NOT_FOUND", "User not found.", 404);
      return;
    }

    ok(res, {
      id: context.id,
      email: context.email,
      firstName: context.firstName,
      lastName: context.lastName,
      updatedAt: new Date().toISOString(),
      preferences: context.preferences,
    });
  }),
);
