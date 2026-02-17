import { Router } from "express";
import { query } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { fail, ok } from "../lib/response";
import { parsePagination } from "../lib/pagination";

const allowedScopes = new Set([
  "all",
  "reviews",
  "conversations",
  "social_posts",
  "campaigns",
  "guests",
]);

export const sharedRouter = Router();

sharedRouter.get(
  "/v1.0/notifications/unread-count",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const type = typeof req.query.type === "string" ? req.query.type : null;

    const rows = await query<{ unread_count: string }>(
      `
      SELECT COUNT(*)::text AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
        AND deleted_at IS NULL
        AND ($2::text IS NULL OR type::text = $2::text)
      `,
      [req.auth.userId, type],
    );

    ok(res, {
      unreadCount: Number(rows[0]?.unread_count ?? 0),
    });
  }),
);

sharedRouter.get(
  "/v1.0/search",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const scope = typeof req.query.scope === "string" ? req.query.scope : "all";

    if (!allowedScopes.has(scope)) {
      fail(res, "VALIDATION_ERROR", "Unsupported search scope.", 400);
      return;
    }

    if (!q) {
      ok(res, {
        reviews: [],
        conversations: [],
        socialPosts: [],
        campaigns: [],
        guests: [],
      }, {
        has_more: false,
      });
      return;
    }

    const { limit } = parsePagination(req, 10, 50);
    const pattern = `%${q}%`;
    const propertyId = req.auth.propertyId;

    const [reviews, conversations, socialPosts, campaigns, guests] = await Promise.all([
      scope !== "all" && scope !== "reviews"
        ? Promise.resolve([])
        : query<{
            id: string;
            title: string;
            author_name: string;
            rating: number;
            reviewed_at: string;
          }>(
            `
            SELECT id, COALESCE(title, body) AS title, author_name, rating, reviewed_at
            FROM reviews
            WHERE property_id = $1
              AND (
                author_name ILIKE $2 OR
                COALESCE(title, '') ILIKE $2 OR
                body ILIKE $2
              )
            ORDER BY reviewed_at DESC, id DESC
            LIMIT $3
            `,
            [propertyId, pattern, limit],
          ),
      scope !== "all" && scope !== "conversations"
        ? Promise.resolve([])
        : query<{
            id: string;
            guest_name: string | null;
            last_message_preview: string | null;
            last_message_at: string | null;
          }>(
            `
            SELECT
              c.id,
              g.full_name AS guest_name,
              c.last_message_preview,
              c.last_message_at
            FROM conversations c
            LEFT JOIN guests g ON g.id = c.guest_id
            WHERE c.property_id = $1
              AND (
                COALESCE(g.full_name, '') ILIKE $2 OR
                COALESCE(c.last_message_preview, '') ILIKE $2
              )
            ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC
            LIMIT $3
            `,
            [propertyId, pattern, limit],
          ),
      scope !== "all" && scope !== "social_posts"
        ? Promise.resolve([])
        : query<{
            id: string;
            title: string;
            status: string;
            scheduled_at: string | null;
          }>(
            `
            SELECT id, title, status::text AS status, scheduled_at
            FROM social_posts
            WHERE property_id = $1
              AND (title ILIKE $2 OR content ILIKE $2)
            ORDER BY scheduled_at DESC NULLS LAST, id DESC
            LIMIT $3
            `,
            [propertyId, pattern, limit],
          ),
      scope !== "all" && scope !== "campaigns"
        ? Promise.resolve([])
        : query<{
            id: string;
            name: string;
            status: string;
            start_date: string;
          }>(
            `
            SELECT id, name, status::text AS status, start_date::text
            FROM campaigns
            WHERE property_id = $1
              AND (name ILIKE $2 OR COALESCE(description, '') ILIKE $2)
            ORDER BY start_date DESC, id DESC
            LIMIT $3
            `,
            [propertyId, pattern, limit],
          ),
      scope !== "all" && scope !== "guests"
        ? Promise.resolve([])
        : query<{
            id: string;
            full_name: string;
            email: string | null;
            created_at: string;
          }>(
            `
            SELECT id, full_name, email, created_at
            FROM guests
            WHERE property_id = $1
              AND (full_name ILIKE $2 OR COALESCE(email, '') ILIKE $2)
            ORDER BY created_at DESC, id DESC
            LIMIT $3
            `,
            [propertyId, pattern, limit],
          ),
    ]);

    ok(
      res,
      {
        reviews,
        conversations,
        socialPosts,
        campaigns,
        guests,
      },
      {
        has_more: false,
      },
    );
  }),
);
