import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { fail, ok } from "../lib/response";
import { parsePagination, sanitizeSortBy } from "../lib/pagination";
import { resolveDateRange } from "../lib/date-range";

const campaignSortValues = ["start_date", "revenue_total", "conversions_total", "progress_percent"] as const;

const createCampaignSchema = z.object({
  name: z.string().min(2).max(200),
  start_date: z.string().date(),
  end_date: z.string().date(),
  channels: z.array(z.enum(["email", "social", "sms"]).or(z.string())).min(1),
  source_template_id: z.string().uuid().optional(),
  objective: z.string().max(1000).optional(),
});

const commandSchema = z.object({
  command: z.enum(["pause", "resume", "start", "complete"]),
});

const useTemplateSchema = z.object({
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export const campaignsRouter = Router();

campaignsRouter.get(
  "/v1.0/campaigns/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "30d";
    const { from, to } = resolveDateRange(range, undefined, undefined);

    const [overview] = await query<{
      active_campaigns: string;
      total_reach: string;
      total_conversions: string;
      total_revenue: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('active', 'scheduled'))::text AS active_campaigns,
        COALESCE(SUM(reach_total), 0)::text AS total_reach,
        COALESCE(SUM(conversions_total), 0)::text AS total_conversions,
        COALESCE(SUM(revenue_total), 0)::text AS total_revenue
      FROM campaigns
      WHERE property_id = $1
        AND created_at BETWEEN $2 AND $3
      `,
      [req.auth.propertyId, from.toISOString(), to.toISOString()],
    );

    ok(res, {
      activeCampaigns: Number(overview?.active_campaigns ?? 0),
      totalReach: Number(overview?.total_reach ?? 0),
      conversions: Number(overview?.total_conversions ?? 0),
      revenueGenerated: Number(overview?.total_revenue ?? 0),
    });
  }),
);

campaignsRouter.get(
  "/v1.0/campaigns",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, campaignSortValues, "start_date");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<(typeof campaignSortValues)[number], { expr: string; cast: string }> = {
      start_date: { expr: "c.start_date", cast: "date" },
      revenue_total: { expr: "c.revenue_total", cast: "numeric" },
      conversions_total: { expr: "c.conversions_total", cast: "integer" },
      progress_percent: { expr: "c.progress_percent", cast: "numeric" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const where: string[] = ["c.property_id = $1"];
    const params: unknown[] = [req.auth.propertyId];

    const statuses = Array.isArray(req.query.status)
      ? req.query.status.map(String)
      : typeof req.query.status === "string"
        ? [req.query.status]
        : [];

    if (statuses.length > 0) {
      params.push(statuses);
      where.push(`c.status::text = ANY($${params.length}::text[])`);
    }

    const channels = Array.isArray(req.query.channel)
      ? req.query.channel.map(String)
      : typeof req.query.channel === "string"
        ? [req.query.channel]
        : [];

    if (channels.length > 0) {
      params.push(channels);
      where.push(`EXISTS (
        SELECT 1
        FROM campaign_channels cc
        WHERE cc.campaign_id = c.id
          AND cc.channel::text = ANY($${params.length}::text[])
      )`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(c.name ILIKE $${params.length} OR COALESCE(c.description, '') ILIKE $${params.length})`);
    }

    if (typeof req.query.start_date_from === "string") {
      params.push(req.query.start_date_from);
      where.push(`c.start_date >= $${params.length}::date`);
    }

    if (typeof req.query.start_date_to === "string") {
      params.push(req.query.start_date_to);
      where.push(`c.start_date <= $${params.length}::date`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::${sortConfig[sortBy].cast}`;
      const idParam = `$${params.length}`;
      where.push(`((${sortExpr} ${compareOp} ${valueParam}) OR (${sortExpr} = ${valueParam} AND c.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      start_date: string;
      end_date: string;
      progress_percent: string;
      reach_total: number;
      conversions_total: number;
      revenue_total: string;
      channels: string[];
      sort_value: string | number;
    }>(
      `
      SELECT
        c.id,
        c.name,
        c.description,
        c.status::text AS status,
        c.start_date::text AS start_date,
        c.end_date::text AS end_date,
        c.progress_percent::text,
        c.reach_total,
        c.conversions_total,
        c.revenue_total::text,
        COALESCE(ch.channels, '{}') AS channels,
        ${sortExpr} AS sort_value
      FROM campaigns c
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(cc.channel::text ORDER BY cc.channel::text) AS channels
        FROM campaign_channels cc
        WHERE cc.campaign_id = c.id
      ) ch ON TRUE
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpr} ${sortDir}, c.id ${sortDir}
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
        items: pageRows,
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

campaignsRouter.post(
  "/v1.0/campaigns/create",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const payload = parsed.data;

    const created = await queryOne<{ id: string; name: string; status: string; start_date: string; end_date: string }>(
      `
      INSERT INTO campaigns (
        property_id,
        name,
        description,
        status,
        start_date,
        end_date,
        progress_percent,
        reach_total,
        conversions_total,
        revenue_total,
        created_by
      )
      VALUES ($1, $2, $3, 'scheduled', $4::date, $5::date, 0, 0, 0, 0, $6)
      RETURNING id, name, status::text AS status, start_date::text, end_date::text
      `,
      [
        req.auth.propertyId,
        payload.name,
        payload.objective ?? null,
        payload.start_date,
        payload.end_date,
        req.auth.userId,
      ],
    );

    if (!created) {
      throw new Error("Failed to create campaign");
    }

    await Promise.all(
      payload.channels.map((channel) =>
        query(
          `INSERT INTO campaign_channels (campaign_id, channel) VALUES ($1, $2::campaign_channel)`,
          [created.id, channel],
        ),
      ),
    );

    ok(
      res,
      {
        ...created,
        channels: payload.channels,
        sourceTemplateId: payload.source_template_id ?? null,
      },
      undefined,
      201,
    );
  }),
);

campaignsRouter.post(
  "/v1.0/campaigns/:id/command",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = commandSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const campaign = await queryOne<{ id: string; status: string }>(
      `SELECT id, status::text AS status FROM campaigns WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!campaign) {
      fail(res, "NOT_FOUND", "Campaign not found.", 404);
      return;
    }

    const statusMap: Record<z.infer<typeof commandSchema>["command"], "paused" | "active" | "completed"> = {
      pause: "paused",
      resume: "active",
      start: "active",
      complete: "completed",
    };

    const nextStatus = statusMap[parsed.data.command];

    const updated = await queryOne<{ id: string; status: string }>(
      `
      UPDATE campaigns
      SET status = $2::campaign_status,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, status::text AS status
      `,
      [req.params.id, nextStatus],
    );

    ok(res, {
      campaignId: updated?.id,
      status: updated?.status,
      command: parsed.data.command,
    });
  }),
);

campaignsRouter.get(
  "/v1.0/campaign-templates",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, ["name", "category", "updated_at"] as const, "updated_at");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<string, { expr: string; cast: string }> = {
      name: { expr: "ct.name", cast: "text" },
      category: { expr: "ct.category", cast: "text" },
      updated_at: { expr: "ct.updated_at", cast: "timestamptz" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const where: string[] = ["ct.is_active = TRUE", "(ct.account_id IS NULL OR ct.account_id = $1)"];
    const params: unknown[] = [req.auth.accountId];

    if (typeof req.query.category === "string") {
      params.push(req.query.category);
      where.push(`ct.category ILIKE $${params.length}`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`ct.name ILIKE $${params.length}`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::${sortConfig[sortBy].cast}`;
      const idParam = `$${params.length}`;
      where.push(`((${sortExpr} ${compareOp} ${valueParam}) OR (${sortExpr} = ${valueParam} AND ct.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      name: string;
      category: string;
      preview_image_url: string | null;
      template_payload: unknown;
      updated_at: string;
      sort_value: string | number;
    }>(
      `
      SELECT
        ct.id,
        ct.name,
        ct.category,
        ct.preview_image_url,
        ct.template_payload,
        ct.updated_at,
        ${sortExpr} AS sort_value
      FROM campaign_templates ct
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpr} ${sortDir}, ct.id ${sortDir}
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
      { items: pageRows },
      {
        next_cursor: nextCursor,
        has_more: hasMore,
        sort_by: sortBy,
        sort_dir: sortDir,
      },
    );
  }),
);

campaignsRouter.post(
  "/v1.0/campaign-templates/:id/use",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = useTemplateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const template = await queryOne<{
      id: string;
      name: string;
      category: string;
      template_payload: { description?: string; channels?: string[] } | null;
    }>(
      `
      SELECT id, name, category, template_payload
      FROM campaign_templates
      WHERE id = $1
        AND is_active = TRUE
        AND (account_id IS NULL OR account_id = $2)
      LIMIT 1
      `,
      [req.params.id, req.auth.accountId],
    );

    if (!template) {
      fail(res, "NOT_FOUND", "Template not found.", 404);
      return;
    }

    const now = new Date();
    const startDate = parsed.data.start_date ?? now.toISOString().slice(0, 10);
    const endDate =
      parsed.data.end_date ??
      new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created = await queryOne<{ id: string; status: string; start_date: string; end_date: string }>(
      `
      INSERT INTO campaigns (
        property_id,
        name,
        description,
        status,
        start_date,
        end_date,
        created_by
      )
      VALUES ($1, $2, $3, 'scheduled', $4::date, $5::date, $6)
      RETURNING id, status::text AS status, start_date::text, end_date::text
      `,
      [
        req.auth.propertyId,
        template.name,
        template.template_payload?.description ?? `${template.category} campaign`,
        startDate,
        endDate,
        req.auth.userId,
      ],
    );

    const channels = template.template_payload?.channels?.filter(Boolean) ?? ["social"];
    await Promise.all(
      channels.map((channel) =>
        query(
          `INSERT INTO campaign_channels (campaign_id, channel) VALUES ($1, $2::campaign_channel)`,
          [created?.id, channel],
        ),
      ),
    );

    ok(res, {
      campaignId: created?.id,
      status: created?.status,
      startDate: created?.start_date,
      endDate: created?.end_date,
      channels,
      sourceTemplateId: template.id,
    }, undefined, 201);
  }),
);
