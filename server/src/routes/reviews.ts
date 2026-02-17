import { Router } from "express";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { fail, ok } from "../lib/response";
import { parsePagination, sanitizeSortBy } from "../lib/pagination";
import { z } from "zod";

const sortByValues = ["reviewed_at", "rating", "status"] as const;

const regenerateSchema = z.object({
  variant: z.enum(["default", "formal", "apology"]).default("default"),
  instructions: z.string().max(1000).optional(),
});

const updateDraftSchema = z.object({
  content: z.string().min(1).max(5000),
});

const approvePublishSchema = z.object({
  publish: z.literal(true),
});

const discardSchema = z.object({
  reason: z.string().max(1000).optional(),
});

function buildDraft(review: { author_name: string; body: string }, variant: "default" | "formal" | "apology", instructions?: string): string {
  const base =
    variant === "formal"
      ? `Dear ${review.author_name}, thank you for your thoughtful feedback.`
      : variant === "apology"
        ? `Dear ${review.author_name}, we sincerely apologize for the experience you described.`
        : `Hi ${review.author_name}, thank you for sharing your review.`;

  const instructionLine = instructions ? ` ${instructions}` : "";

  return `${base} We appreciate your comments and will continue improving.${instructionLine}`;
}

export const reviewsRouter = Router();

reviewsRouter.get(
  "/v1.0/reviews",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, sortByValues, "reviewed_at");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<(typeof sortByValues)[number], { expr: string; cast: string }> = {
      reviewed_at: { expr: "r.reviewed_at", cast: "timestamptz" },
      rating: { expr: "r.rating", cast: "integer" },
      status: { expr: "r.status::text", cast: "text" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const params: unknown[] = [req.auth.propertyId];
    const where: string[] = ["r.property_id = $1"];

    if (typeof req.query.status === "string") {
      params.push(req.query.status);
      where.push(`r.status::text = $${params.length}`);
    }

    const platforms = Array.isArray(req.query.platform)
      ? req.query.platform.map(String)
      : typeof req.query.platform === "string"
        ? [req.query.platform]
        : [];

    if (platforms.length > 0) {
      params.push(platforms);
      where.push(`r.platform::text = ANY($${params.length}::text[])`);
    }

    if (typeof req.query.sentiment === "string") {
      params.push(req.query.sentiment);
      where.push(`r.sentiment::text = $${params.length}`);
    }

    if (typeof req.query.rating_min === "string") {
      params.push(Number(req.query.rating_min));
      where.push(`r.rating >= $${params.length}`);
    }

    if (typeof req.query.rating_max === "string") {
      params.push(Number(req.query.rating_max));
      where.push(`r.rating <= $${params.length}`);
    }

    if (typeof req.query.date_from === "string") {
      params.push(req.query.date_from);
      where.push(`r.reviewed_at::date >= $${params.length}::date`);
    }

    if (typeof req.query.date_to === "string") {
      params.push(req.query.date_to);
      where.push(`r.reviewed_at::date <= $${params.length}::date`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(r.author_name ILIKE $${params.length} OR COALESCE(r.title, '') ILIKE $${params.length} OR r.body ILIKE $${params.length})`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::${sortConfig[sortBy].cast}`;
      const idParam = `$${params.length}`;
      where.push(`((${sortExpr} ${compareOp} ${valueParam}) OR (${sortExpr} = ${valueParam} AND r.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      platform: string;
      author_name: string;
      rating: number;
      title: string | null;
      body: string;
      reviewed_at: string;
      status: string;
      sentiment: string;
      draft_content: string | null;
      sort_value: string | number;
    }>(
      `
      SELECT
        r.id,
        r.platform::text AS platform,
        r.author_name,
        r.rating,
        r.title,
        r.body,
        r.reviewed_at,
        r.status::text AS status,
        r.sentiment::text AS sentiment,
        d.content AS draft_content,
        ${sortExpr} AS sort_value
      FROM reviews r
      LEFT JOIN LATERAL (
        SELECT content
        FROM review_response_drafts rrd
        WHERE rrd.review_id = r.id
          AND rrd.is_current = TRUE
        ORDER BY rrd.version_no DESC
        LIMIT 1
      ) d ON TRUE
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpr} ${sortDir}, r.id ${sortDir}
      LIMIT $${params.length}
      `,
      params,
    );

    const summary = await queryOne<{
      total: string;
      pending: string;
      urgent: string;
      avg_rating: string;
    }>(
      `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
        COUNT(*) FILTER (WHERE status = 'urgent')::text AS urgent,
        COALESCE(AVG(rating), 0)::text AS avg_rating
      FROM reviews
      WHERE property_id = $1
      `,
      [req.auth.propertyId],
    );

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const nextCursor = hasMore
      ? encodeCursor({
          value: pageRows[pageRows.length - 1]!.sort_value,
          id: pageRows[pageRows.length - 1]!.id,
        })
      : null;

    ok(
      res,
      {
        items: pageRows.map((row) => ({
          id: row.id,
          platform: row.platform,
          author: row.author_name,
          rating: row.rating,
          title: row.title,
          content: row.body,
          reviewedAt: row.reviewed_at,
          status: row.status,
          sentiment: row.sentiment,
          aiResponse: row.draft_content,
        })),
        summary: {
          total: Number(summary?.total ?? 0),
          pending: Number(summary?.pending ?? 0),
          urgent: Number(summary?.urgent ?? 0),
          avg_rating: Number(summary?.avg_rating ?? 0),
        },
      },
      {
        next_cursor: nextCursor,
        has_more: hasMore,
        sort_by: sortBy,
        sort_dir: sortDir,
      },
    );
  }),
);

reviewsRouter.get(
  "/v1.0/reviews/:id",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const review = await queryOne<{
      id: string;
      platform: string;
      author_name: string;
      rating: number;
      title: string | null;
      body: string;
      reviewed_at: string;
      status: string;
      sentiment: string;
      external_url: string | null;
      draft_id: string | null;
      draft_content: string | null;
      draft_status: string | null;
      draft_variant: string | null;
      draft_version_no: number | null;
    }>(
      `
      SELECT
        r.id,
        r.platform::text AS platform,
        r.author_name,
        r.rating,
        r.title,
        r.body,
        r.reviewed_at,
        r.status::text AS status,
        r.sentiment::text AS sentiment,
        r.external_url,
        d.id AS draft_id,
        d.content AS draft_content,
        d.status::text AS draft_status,
        d.variant::text AS draft_variant,
        d.version_no AS draft_version_no
      FROM reviews r
      LEFT JOIN LATERAL (
        SELECT id, content, status, variant, version_no
        FROM review_response_drafts rrd
        WHERE rrd.review_id = r.id
          AND rrd.is_current = TRUE
        ORDER BY rrd.version_no DESC
        LIMIT 1
      ) d ON TRUE
      WHERE r.id = $1
        AND r.property_id = $2
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!review) {
      fail(res, "NOT_FOUND", "Review not found.", 404);
      return;
    }

    ok(res, review);
  }),
);

reviewsRouter.post(
  "/v1.0/reviews/:id/response/regenerate",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = regenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const review = await queryOne<{ id: string; author_name: string; body: string }>(
      `SELECT id, author_name, body FROM reviews WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!review) {
      fail(res, "NOT_FOUND", "Review not found.", 404);
      return;
    }

    const version = await queryOne<{ next_version: number }>(
      `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version FROM review_response_drafts WHERE review_id = $1`,
      [review.id],
    );

    const nextVersion = Number(version?.next_version ?? 1);

    await query(`UPDATE review_response_drafts SET is_current = FALSE WHERE review_id = $1`, [review.id]);

    const content = buildDraft(review, parsed.data.variant, parsed.data.instructions);

    const draft = await queryOne<{
      id: string;
      review_id: string;
      content: string;
      variant: string;
      status: string;
      version_no: number;
      created_at: string;
    }>(
      `
      INSERT INTO review_response_drafts (
        review_id,
        version_no,
        content,
        variant,
        status,
        generated_by_ai,
        is_current,
        created_by
      )
      VALUES ($1, $2, $3, $4::review_response_variant, 'draft', TRUE, TRUE, $5)
      RETURNING id, review_id, content, variant::text AS variant, status::text AS status, version_no, created_at
      `,
      [review.id, nextVersion, content, parsed.data.variant, req.auth.userId],
    );

    ok(res, draft, undefined, 201);
  }),
);

reviewsRouter.patch(
  "/v1.0/reviews/:id/response/draft",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = updateDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const current = await queryOne<{ id: string }>(
      `
      SELECT rrd.id
      FROM review_response_drafts rrd
      JOIN reviews r ON r.id = rrd.review_id
      WHERE r.id = $1
        AND r.property_id = $2
        AND rrd.is_current = TRUE
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!current) {
      fail(res, "NOT_FOUND", "Current draft not found.", 404);
      return;
    }

    const updated = await queryOne<{
      id: string;
      content: string;
      status: string;
      updated_at: string;
    }>(
      `
      UPDATE review_response_drafts
      SET content = $2,
          status = 'draft'
      WHERE id = $1
      RETURNING id, content, status::text AS status, created_at AS updated_at
      `,
      [current.id, parsed.data.content],
    );

    ok(res, updated);
  }),
);

reviewsRouter.post(
  "/v1.0/reviews/:id/response/approve-publish",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = approvePublishSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const review = await queryOne<{ id: string }>(
      `SELECT id FROM reviews WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!review) {
      fail(res, "NOT_FOUND", "Review not found.", 404);
      return;
    }

    await query(
      `
      UPDATE review_response_drafts
      SET status = 'published',
          published_at = NOW()
      WHERE review_id = $1
        AND is_current = TRUE
      `,
      [review.id],
    );

    const updated = await queryOne<{ id: string; status: string }>(
      `
      UPDATE reviews
      SET status = 'published',
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, status::text AS status
      `,
      [review.id],
    );

    ok(res, {
      reviewId: updated?.id,
      status: updated?.status,
      published: parsed.data.publish,
    });
  }),
);

reviewsRouter.post(
  "/v1.0/reviews/:id/response/discard",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = discardSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const review = await queryOne<{ id: string }>(
      `SELECT id FROM reviews WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!review) {
      fail(res, "NOT_FOUND", "Review not found.", 404);
      return;
    }

    await query(
      `
      UPDATE review_response_drafts
      SET status = 'discarded',
          is_current = FALSE
      WHERE review_id = $1
        AND is_current = TRUE
      `,
      [review.id],
    );

    await query(
      `
      UPDATE reviews
      SET status = 'discarded',
          updated_at = NOW()
      WHERE id = $1
      `,
      [review.id],
    );

    ok(res, {
      reviewId: review.id,
      status: "discarded",
      reason: parsed.data.reason ?? null,
    });
  }),
);
