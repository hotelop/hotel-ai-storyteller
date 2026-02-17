import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { fail, ok } from "../lib/response";
import { parsePagination, sanitizeSortBy } from "../lib/pagination";
import { resolveDateRange } from "../lib/date-range";

const sortByValues = ["scheduled_at", "estimated_reach", "created_at"] as const;

const createFromAiSchema = z.object({
  platforms: z.array(z.enum(["instagram", "facebook", "linkedin", "twitter"])).min(1),
  goal: z.string().min(3),
  tone: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  seed_prompt: z.string().optional(),
});

const patchDraftSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(3000).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  platforms: z.array(z.enum(["instagram", "facebook", "linkedin", "twitter"])).optional(),
  asset_urls: z.array(z.string().url()).optional(),
});

const optimizeSchema = z.object({
  objective: z.enum(["engagement", "reach", "conversion"]),
  keep_brand_voice: z.boolean().default(true),
});

function buildSocialCopy(goal: string, tone?: string, seedPrompt?: string): { title: string; content: string } {
  const normalizedTone = tone ?? "Professional";
  const seed = seedPrompt ? ` ${seedPrompt.trim()}` : "";

  return {
    title: `${goal.slice(0, 60)} ✨`,
    content: `${normalizedTone} update: ${goal}.${seed} #HotelOps #Hospitality`,
  };
}

export const socialRouter = Router();

socialRouter.get(
  "/v1.0/social/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "7d";
    const { from, to } = resolveDateRange(range, undefined, undefined);

    const [stats] = await query<{
      scheduled: string;
      published_this_week: string;
      total_reach: string;
      engagement_rate: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled')::text AS scheduled,
        COUNT(*) FILTER (
          WHERE status = 'published'
            AND published_at >= date_trunc('week', NOW())
        )::text AS published_this_week,
        COALESCE(SUM(COALESCE(actual_reach, estimated_reach, 0)), 0)::text AS total_reach,
        COALESCE(AVG(engagement_rate), 0)::text AS engagement_rate
      FROM social_posts
      WHERE property_id = $1
        AND created_at BETWEEN $2 AND $3
      `,
      [req.auth.propertyId, from.toISOString(), to.toISOString()],
    );

    ok(res, {
      scheduled: Number(stats?.scheduled ?? 0),
      publishedThisWeek: Number(stats?.published_this_week ?? 0),
      totalReach: Number(stats?.total_reach ?? 0),
      engagementRate: Number(stats?.engagement_rate ?? 0),
    });
  }),
);

socialRouter.get(
  "/v1.0/social/calendar",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const view = req.query.view === "month" ? "month" : "week";
    const anchorDate = typeof req.query.anchor_date === "string" ? new Date(req.query.anchor_date) : new Date();

    if (Number.isNaN(anchorDate.getTime())) {
      fail(res, "VALIDATION_ERROR", "Invalid anchor_date.", 400);
      return;
    }

    const platformFilter = Array.isArray(req.query.platform)
      ? req.query.platform.map(String)
      : typeof req.query.platform === "string"
        ? [req.query.platform]
        : [];

    const statusFilter = Array.isArray(req.query.status)
      ? req.query.status.map(String)
      : typeof req.query.status === "string"
        ? [req.query.status]
        : [];

    const start = new Date(anchorDate);
    const end = new Date(anchorDate);

    if (view === "week") {
      const day = (start.getUTCDay() + 6) % 7;
      start.setUTCDate(start.getUTCDate() - day);
      end.setUTCDate(start.getUTCDate() + 6);
    } else {
      start.setUTCDate(1);
      end.setUTCMonth(end.getUTCMonth() + 1, 0);
    }

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const params: unknown[] = [req.auth.propertyId, start.toISOString(), end.toISOString()];
    const where: string[] = [
      "sp.property_id = $1",
      "sp.scheduled_at BETWEEN $2 AND $3",
    ];

    if (platformFilter.length > 0) {
      params.push(platformFilter);
      where.push(`EXISTS (
        SELECT 1
        FROM social_post_platforms spp
        WHERE spp.post_id = sp.id
          AND spp.platform::text = ANY($${params.length}::text[])
      )`);
    }

    if (statusFilter.length > 0) {
      params.push(statusFilter);
      where.push(`sp.status::text = ANY($${params.length}::text[])`);
    }

    const rows = await query<{ day: string; count: string; platforms: string[] }>(
      `
      SELECT
        date_trunc('day', sp.scheduled_at)::date::text AS day,
        COUNT(*)::text AS count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT spp.platform::text), NULL) AS platforms
      FROM social_posts sp
      LEFT JOIN social_post_platforms spp ON spp.post_id = sp.id
      WHERE ${where.join(" AND ")}
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      params,
    );

    ok(res, {
      view,
      anchorDate: anchorDate.toISOString(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: rows.map((row) => ({
        day: row.day,
        count: Number(row.count),
        platforms: row.platforms ?? [],
      })),
    });
  }),
);

socialRouter.get(
  "/v1.0/social/posts",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, sortByValues, "scheduled_at");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<(typeof sortByValues)[number], { expr: string; cursorCast: string }> = {
      scheduled_at: { expr: "COALESCE(sp.scheduled_at, sp.created_at)", cursorCast: "timestamptz" },
      estimated_reach: { expr: "COALESCE(sp.estimated_reach, 0)", cursorCast: "integer" },
      created_at: { expr: "sp.created_at", cursorCast: "timestamptz" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const where: string[] = ["sp.property_id = $1"];
    const params: unknown[] = [req.auth.propertyId];

    if (typeof req.query.date === "string") {
      params.push(req.query.date);
      where.push(`sp.scheduled_at::date = $${params.length}::date`);
    }

    if (typeof req.query.date_from === "string") {
      params.push(req.query.date_from);
      where.push(`sp.scheduled_at::date >= $${params.length}::date`);
    }

    if (typeof req.query.date_to === "string") {
      params.push(req.query.date_to);
      where.push(`sp.scheduled_at::date <= $${params.length}::date`);
    }

    const platforms = Array.isArray(req.query.platform)
      ? req.query.platform.map(String)
      : typeof req.query.platform === "string"
        ? [req.query.platform]
        : [];

    if (platforms.length > 0) {
      params.push(platforms);
      where.push(`EXISTS (
        SELECT 1
        FROM social_post_platforms spp
        WHERE spp.post_id = sp.id
          AND spp.platform::text = ANY($${params.length}::text[])
      )`);
    }

    const statuses = Array.isArray(req.query.status)
      ? req.query.status.map(String)
      : typeof req.query.status === "string"
        ? [req.query.status]
        : [];

    if (statuses.length > 0) {
      params.push(statuses);
      where.push(`sp.status::text = ANY($${params.length}::text[])`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(sp.title ILIKE $${params.length} OR sp.content ILIKE $${params.length})`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::${sortConfig[sortBy].cursorCast}`;
      const idParam = `$${params.length}`;
      where.push(
        `(
          (${sortExpr} ${compareOp} ${valueParam})
          OR (${sortExpr} = ${valueParam} AND sp.id ${compareOp} ${idParam})
        )`,
      );
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      title: string;
      content: string;
      status: string;
      scheduled_at: string | null;
      published_at: string | null;
      estimated_reach: number | null;
      ai_generated: boolean;
      created_at: string;
      sort_value: string | number;
      platforms: string[];
      first_asset: string | null;
    }>(
      `
      SELECT
        sp.id,
        sp.title,
        sp.content,
        sp.status::text AS status,
        sp.scheduled_at,
        sp.published_at,
        sp.estimated_reach,
        sp.ai_generated,
        sp.created_at,
        ${sortExpr} AS sort_value,
        COALESCE(pl.platforms, '{}') AS platforms,
        asset.asset_url AS first_asset
      FROM social_posts sp
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(spp.platform::text ORDER BY spp.platform::text) AS platforms
        FROM social_post_platforms spp
        WHERE spp.post_id = sp.id
      ) pl ON TRUE
      LEFT JOIN LATERAL (
        SELECT spa.asset_url
        FROM social_post_assets spa
        WHERE spa.post_id = sp.id
        ORDER BY spa.sort_order ASC, spa.created_at ASC
        LIMIT 1
      ) asset ON TRUE
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpr} ${sortDir}, sp.id ${sortDir}
      LIMIT $${params.length}
      `,
      params,
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
          title: row.title,
          content: row.content,
          status: row.status,
          scheduledAt: row.scheduled_at,
          publishedAt: row.published_at,
          estimatedReach: row.estimated_reach,
          aiGenerated: row.ai_generated,
          platforms: row.platforms,
          imageUrl: row.first_asset,
          createdAt: row.created_at,
        })),
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

socialRouter.get(
  "/v1.0/social/posts/:id",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const post = await queryOne<{
      id: string;
      title: string;
      content: string;
      status: string;
      scheduled_at: string | null;
      published_at: string | null;
      estimated_reach: number | null;
      actual_reach: number | null;
      engagement_rate: string | null;
      ai_generated: boolean;
      created_at: string;
      updated_at: string;
      platforms: string[];
      assets: string[];
    }>(
      `
      SELECT
        sp.id,
        sp.title,
        sp.content,
        sp.status::text AS status,
        sp.scheduled_at,
        sp.published_at,
        sp.estimated_reach,
        sp.actual_reach,
        sp.engagement_rate::text,
        sp.ai_generated,
        sp.created_at,
        sp.updated_at,
        COALESCE(pl.platforms, '{}') AS platforms,
        COALESCE(ast.assets, '{}') AS assets
      FROM social_posts sp
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(spp.platform::text ORDER BY spp.platform::text) AS platforms
        FROM social_post_platforms spp
        WHERE spp.post_id = sp.id
      ) pl ON TRUE
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(spa.asset_url ORDER BY spa.sort_order ASC, spa.created_at ASC) AS assets
        FROM social_post_assets spa
        WHERE spa.post_id = sp.id
      ) ast ON TRUE
      WHERE sp.id = $1
        AND sp.property_id = $2
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!post) {
      fail(res, "NOT_FOUND", "Social post not found.", 404);
      return;
    }

    const versions = await query<{
      id: string;
      version_no: number;
      title: string;
      content: string;
      optimization_reason: string | null;
      generated_by_ai: boolean;
      is_current: boolean;
      created_at: string;
    }>(
      `
      SELECT id, version_no, title, content, optimization_reason, generated_by_ai, is_current, created_at
      FROM social_post_versions
      WHERE post_id = $1
      ORDER BY version_no DESC
      `,
      [post.id],
    );

    ok(res, {
      ...post,
      versions,
    });
  }),
);

socialRouter.post(
  "/v1.0/social/posts/create-from-ai",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = createFromAiSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const aiDraft = buildSocialCopy(parsed.data.goal, parsed.data.tone, parsed.data.seed_prompt);

    const created = await queryOne<{ id: string }>(
      `
      INSERT INTO social_posts (
        property_id,
        title,
        content,
        status,
        scheduled_at,
        ai_generated,
        created_by
      )
      VALUES ($1, $2, $3, 'draft', $4, TRUE, $5)
      RETURNING id
      `,
      [
        req.auth.propertyId,
        aiDraft.title,
        aiDraft.content,
        parsed.data.scheduled_at ?? null,
        req.auth.userId,
      ],
    );

    if (!created) {
      throw new Error("Failed to create social post");
    }

    await Promise.all(
      parsed.data.platforms.map((platform) =>
        query(
          `INSERT INTO social_post_platforms (post_id, platform) VALUES ($1, $2::social_platform) ON CONFLICT DO NOTHING`,
          [created.id, platform],
        ),
      ),
    );

    await query(
      `
      INSERT INTO social_post_versions (
        post_id,
        version_no,
        title,
        content,
        optimization_reason,
        generated_by_ai,
        is_current,
        created_by
      )
      VALUES ($1, 1, $2, $3, 'Initial AI draft', TRUE, TRUE, $4)
      `,
      [created.id, aiDraft.title, aiDraft.content, req.auth.userId],
    );

    ok(res, {
      id: created.id,
      title: aiDraft.title,
      content: aiDraft.content,
      platforms: parsed.data.platforms,
      scheduledAt: parsed.data.scheduled_at ?? null,
      status: "draft",
      aiGenerated: true,
    }, undefined, 201);
  }),
);

socialRouter.patch(
  "/v1.0/social/posts/:id/draft",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = patchDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const post = await queryOne<{ id: string }>(
      `SELECT id FROM social_posts WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!post) {
      fail(res, "NOT_FOUND", "Social post not found.", 404);
      return;
    }

    const payload = parsed.data;

    await query(
      `
      UPDATE social_posts
      SET
        title = COALESCE($3, title),
        content = COALESCE($4, content),
        scheduled_at = CASE WHEN $5::timestamptz IS NULL THEN scheduled_at ELSE $5::timestamptz END,
        updated_at = NOW()
      WHERE id = $1
        AND property_id = $2
      `,
      [req.params.id, req.auth.propertyId, payload.title ?? null, payload.content ?? null, payload.scheduled_at ?? null],
    );

    if (payload.platforms) {
      await query(`DELETE FROM social_post_platforms WHERE post_id = $1`, [req.params.id]);
      await Promise.all(
        payload.platforms.map((platform) =>
          query(
            `INSERT INTO social_post_platforms (post_id, platform) VALUES ($1, $2::social_platform)`,
            [req.params.id, platform],
          ),
        ),
      );
    }

    if (payload.asset_urls) {
      await query(`DELETE FROM social_post_assets WHERE post_id = $1`, [req.params.id]);
      await Promise.all(
        payload.asset_urls.map((assetUrl, index) =>
          query(
            `
            INSERT INTO social_post_assets (id, post_id, asset_url, asset_type, sort_order)
            VALUES ($1, $2, $3, 'image', $4)
            `,
            [randomUUID(), req.params.id, assetUrl, index],
          ),
        ),
      );
    }

    const updated = await queryOne<{
      id: string;
      title: string;
      content: string;
      status: string;
      scheduled_at: string | null;
      updated_at: string;
    }>(
      `
      SELECT id, title, content, status::text AS status, scheduled_at, updated_at
      FROM social_posts
      WHERE id = $1
      `,
      [req.params.id],
    );

    ok(res, updated);
  }),
);

socialRouter.post(
  "/v1.0/social/posts/:id/optimize",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = optimizeSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const post = await queryOne<{ id: string; title: string; content: string }>(
      `
      SELECT id, title, content
      FROM social_posts
      WHERE id = $1
        AND property_id = $2
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!post) {
      fail(res, "NOT_FOUND", "Social post not found.", 404);
      return;
    }

    const objective = parsed.data.objective;
    const optimizedTitle = `${post.title} (${objective})`;
    const optimizedContent = `${post.content}\n\nOptimized for ${objective}.`;

    const version = await queryOne<{ next_version: number }>(
      `
      SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
      FROM social_post_versions
      WHERE post_id = $1
      `,
      [post.id],
    );

    const nextVersion = Number(version?.next_version ?? 1);

    await query(
      `UPDATE social_post_versions SET is_current = FALSE WHERE post_id = $1`,
      [post.id],
    );

    await query(
      `
      INSERT INTO social_post_versions (
        post_id,
        version_no,
        title,
        content,
        optimization_reason,
        generated_by_ai,
        is_current,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, $6)
      `,
      [post.id, nextVersion, optimizedTitle, optimizedContent, `Optimize for ${objective}`, req.auth.userId],
    );

    await query(
      `
      UPDATE social_posts
      SET title = $2,
          content = $3,
          updated_at = NOW()
      WHERE id = $1
      `,
      [post.id, optimizedTitle, optimizedContent],
    );

    ok(res, {
      postId: post.id,
      version: nextVersion,
      objective,
      keepBrandVoice: parsed.data.keep_brand_voice,
      title: optimizedTitle,
      content: optimizedContent,
    });
  }),
);
