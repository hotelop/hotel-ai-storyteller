import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { fail, ok } from "../lib/response";
import { parsePagination, sanitizeSortBy } from "../lib/pagination";

const patchPropertySchema = z.object({
  property: z
    .object({
      name: z.string().min(1).max(200).optional(),
      address_line1: z.string().max(300).nullable().optional(),
      city: z.string().max(100).nullable().optional(),
      country: z.string().max(100).nullable().optional(),
      property_type: z.string().max(100).nullable().optional(),
      timezone: z.string().max(100).optional(),
      currency_code: z.string().max(10).optional(),
    })
    .optional(),
  brandVoice: z
    .object({
      tone_of_voice: z.string().max(50).optional(),
      key_selling_points: z.array(z.string().max(200)).optional(),
      signature_signoff: z.string().max(200).nullable().optional(),
      use_guest_names: z.boolean().optional(),
      multilingual_responses: z.boolean().optional(),
    })
    .optional(),
});

const integrationCommandSchema = z.object({
  command: z.enum(["connect", "disconnect", "refresh", "manage"]),
});

const patchAgentsSchema = z.object({
  agents: z
    .array(
      z.object({
        key: z.enum(["review_reply", "social_posting", "messaging", "campaign"]),
        enabled: z.boolean(),
      }),
    )
    .optional(),
  auto_approval_mode: z.boolean().optional(),
});

const patchNotificationsSchema = z.object({
  new_reviews: z.boolean().optional(),
  negative_reviews: z.boolean().optional(),
  guest_messages: z.boolean().optional(),
  campaign_performance: z.boolean().optional(),
  ai_agent_activity: z.boolean().optional(),
});

const integrationSortValues = ["provider", "status", "updated_at"] as const;

const integrationProviders = new Set([
  "tripadvisor",
  "google_business",
  "booking_com",
  "expedia",
  "facebook",
  "instagram",
  "whatsapp_business",
  "mailchimp",
]);

export const settingsRouter = Router();

settingsRouter.get(
  "/v1.0/settings/property",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const property = await queryOne<{
      id: string;
      name: string;
      address_line1: string | null;
      city: string | null;
      country: string | null;
      property_type: string | null;
      timezone: string;
      currency_code: string;
    }>(
      `
      SELECT id, name, address_line1, city, country, property_type, timezone, currency_code
      FROM properties
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [req.auth.propertyId],
    );

    if (!property) {
      fail(res, "NOT_FOUND", "Property not found.", 404);
      return;
    }

    const brand = await queryOne<{
      tone_of_voice: string;
      key_selling_points: string[];
      signature_signoff: string | null;
      use_guest_names: boolean;
      multilingual_responses: boolean;
    }>(
      `
      SELECT tone_of_voice, key_selling_points, signature_signoff, use_guest_names, multilingual_responses
      FROM property_brand_settings
      WHERE property_id = $1
      LIMIT 1
      `,
      [req.auth.propertyId],
    );

    ok(res, {
      property,
      brandVoice: brand ?? {
        tone_of_voice: "professional",
        key_selling_points: [],
        signature_signoff: null,
        use_guest_names: true,
        multilingual_responses: false,
      },
    });
  }),
);

settingsRouter.patch(
  "/v1.0/settings/property",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = patchPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const payload = parsed.data;

    if (payload.property) {
      await query(
        `
        UPDATE properties
        SET
          name = COALESCE($2, name),
          address_line1 = COALESCE($3, address_line1),
          city = COALESCE($4, city),
          country = COALESCE($5, country),
          property_type = COALESCE($6, property_type),
          timezone = COALESCE($7, timezone),
          currency_code = COALESCE($8, currency_code),
          updated_by = $1,
          updated_at = NOW()
        WHERE id = $9
        `,
        [
          req.auth.userId,
          payload.property.name ?? null,
          payload.property.address_line1 ?? null,
          payload.property.city ?? null,
          payload.property.country ?? null,
          payload.property.property_type ?? null,
          payload.property.timezone ?? null,
          payload.property.currency_code ?? null,
          req.auth.propertyId,
        ],
      );
    }

    if (payload.brandVoice) {
      await query(
        `
        INSERT INTO property_brand_settings (
          property_id,
          tone_of_voice,
          key_selling_points,
          signature_signoff,
          use_guest_names,
          multilingual_responses,
          updated_by
        )
        VALUES (
          $1,
          COALESCE($2, 'professional'),
          COALESCE($3, '{}'::text[]),
          $4,
          COALESCE($5, TRUE),
          COALESCE($6, FALSE),
          $7
        )
        ON CONFLICT (property_id) DO UPDATE
        SET
          tone_of_voice = COALESCE($2, property_brand_settings.tone_of_voice),
          key_selling_points = COALESCE($3, property_brand_settings.key_selling_points),
          signature_signoff = COALESCE($4, property_brand_settings.signature_signoff),
          use_guest_names = COALESCE($5, property_brand_settings.use_guest_names),
          multilingual_responses = COALESCE($6, property_brand_settings.multilingual_responses),
          updated_by = $7,
          updated_at = NOW()
        `,
        [
          req.auth.propertyId,
          payload.brandVoice.tone_of_voice ?? null,
          payload.brandVoice.key_selling_points ?? null,
          payload.brandVoice.signature_signoff ?? null,
          payload.brandVoice.use_guest_names ?? null,
          payload.brandVoice.multilingual_responses ?? null,
          req.auth.userId,
        ],
      );
    }

    const updated = await queryOne<{
      id: string;
      name: string;
      address_line1: string | null;
      city: string | null;
      country: string | null;
      property_type: string | null;
      timezone: string;
      currency_code: string;
    }>(
      `
      SELECT id, name, address_line1, city, country, property_type, timezone, currency_code
      FROM properties
      WHERE id = $1
      LIMIT 1
      `,
      [req.auth.propertyId],
    );

    ok(res, updated);
  }),
);

settingsRouter.get(
  "/v1.0/settings/integrations",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, integrationSortValues, "updated_at");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<(typeof integrationSortValues)[number], { expr: string; cast: string }> = {
      provider: { expr: "pi.provider::text", cast: "text" },
      status: { expr: "pi.status::text", cast: "text" },
      updated_at: { expr: "pi.updated_at", cast: "timestamptz" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const where: string[] = ["pi.property_id = $1"];
    const params: unknown[] = [req.auth.propertyId];

    if (typeof req.query.status === "string") {
      params.push(req.query.status);
      where.push(`pi.status::text = $${params.length}`);
    }

    if (typeof req.query.provider === "string") {
      params.push(req.query.provider);
      where.push(`pi.provider::text = $${params.length}`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`pi.provider::text ILIKE $${params.length}`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::${sortConfig[sortBy].cast}`;
      const idParam = `$${params.length}`;
      where.push(`((${sortExpr} ${compareOp} ${valueParam}) OR (${sortExpr} = ${valueParam} AND pi.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      provider: string;
      status: string;
      external_account_id: string | null;
      connected_at: string | null;
      last_synced_at: string | null;
      metadata: unknown;
      updated_at: string;
      sort_value: string | number;
    }>(
      `
      SELECT
        pi.id,
        pi.provider::text AS provider,
        pi.status::text AS status,
        pi.external_account_id,
        pi.connected_at,
        pi.last_synced_at,
        pi.metadata,
        pi.updated_at,
        ${sortExpr} AS sort_value
      FROM property_integrations pi
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpr} ${sortDir}, pi.id ${sortDir}
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

settingsRouter.post(
  "/v1.0/settings/integrations/:provider/command",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const providerParam = req.params.provider;
    const provider = Array.isArray(providerParam) ? providerParam[0] : providerParam;
    if (!integrationProviders.has(provider)) {
      fail(res, "VALIDATION_ERROR", "Unsupported provider.", 400);
      return;
    }

    const parsed = integrationCommandSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const command = parsed.data.command;

    const nextStatus =
      command === "connect"
        ? "connected"
        : command === "disconnect"
          ? "disconnected"
          : command === "refresh"
            ? "connected"
            : "pending";

    await query(
      `
      INSERT INTO property_integrations (
        property_id,
        provider,
        status,
        connected_at,
        last_synced_at,
        metadata
      )
      VALUES (
        $1,
        $2::integration_provider,
        $3::integration_status,
        CASE WHEN $3 = 'connected' THEN NOW() ELSE NULL END,
        CASE WHEN $4 THEN NOW() ELSE NULL END,
        jsonb_build_object('lastCommand', $5, 'updatedBy', $6, 'updatedAt', NOW())
      )
      ON CONFLICT (property_id, provider) DO UPDATE
      SET
        status = EXCLUDED.status,
        connected_at = CASE
          WHEN EXCLUDED.status = 'connected' THEN COALESCE(property_integrations.connected_at, NOW())
          ELSE NULL
        END,
        last_synced_at = CASE
          WHEN $4 THEN NOW()
          ELSE property_integrations.last_synced_at
        END,
        metadata = property_integrations.metadata || EXCLUDED.metadata,
        updated_at = NOW()
      `,
      [
        req.auth.propertyId,
        provider,
        nextStatus,
        command === "refresh",
        command,
        req.auth.userId,
      ],
    );

    const integration = await queryOne<{
      id: string;
      provider: string;
      status: string;
      connected_at: string | null;
      last_synced_at: string | null;
      metadata: unknown;
    }>(
      `
      SELECT id, provider::text AS provider, status::text AS status, connected_at, last_synced_at, metadata
      FROM property_integrations
      WHERE property_id = $1
        AND provider = $2::integration_provider
      LIMIT 1
      `,
      [req.auth.propertyId, provider],
    );

    ok(res, {
      command,
      integration,
    });
  }),
);

settingsRouter.get(
  "/v1.0/settings/agents",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const [autoApproval, agents] = await Promise.all([
      queryOne<{ auto_approval_mode: boolean }>(
        `SELECT auto_approval_mode FROM property_ai_settings WHERE property_id = $1 LIMIT 1`,
        [req.auth.propertyId],
      ),
      query<{
        key: string;
        name: string;
        description: string | null;
        status: string;
        enabled: boolean;
        auto_approve: boolean;
        max_tasks_per_hour: number;
        priority_level: string;
        notifications_enabled: boolean;
        retry_on_failure: boolean;
        max_retries: number;
      }>(
        `
        SELECT
          key::text AS key,
          name,
          description,
          status::text AS status,
          enabled,
          auto_approve,
          max_tasks_per_hour,
          priority_level::text AS priority_level,
          notifications_enabled,
          retry_on_failure,
          max_retries
        FROM ai_agents
        WHERE property_id = $1
        ORDER BY key::text ASC
        `,
        [req.auth.propertyId],
      ),
    ]);

    ok(res, {
      auto_approval_mode: autoApproval?.auto_approval_mode ?? false,
      agents,
    });
  }),
);

settingsRouter.patch(
  "/v1.0/settings/agents",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = patchAgentsSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    if (parsed.data.agents) {
      await Promise.all(
        parsed.data.agents.map((agent) =>
          query(
            `
            UPDATE ai_agents
            SET enabled = $3,
                status = CASE WHEN $3 THEN 'active'::agent_status ELSE 'paused'::agent_status END,
                updated_at = NOW()
            WHERE property_id = $1
              AND key = $2::agent_key
            `,
            [req.auth.propertyId, agent.key, agent.enabled],
          ),
        ),
      );
    }

    if (parsed.data.auto_approval_mode !== undefined) {
      await query(
        `
        INSERT INTO property_ai_settings (property_id, auto_approval_mode, updated_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (property_id) DO UPDATE
        SET auto_approval_mode = EXCLUDED.auto_approval_mode,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        `,
        [req.auth.propertyId, parsed.data.auto_approval_mode, req.auth.userId],
      );
    }

    const refreshed = await query<{
      key: string;
      enabled: boolean;
      status: string;
    }>(
      `
      SELECT key::text AS key, enabled, status::text AS status
      FROM ai_agents
      WHERE property_id = $1
      ORDER BY key::text ASC
      `,
      [req.auth.propertyId],
    );

    ok(res, {
      agents: refreshed,
      auto_approval_mode: parsed.data.auto_approval_mode,
    });
  }),
);

settingsRouter.get(
  "/v1.0/settings/notifications",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    await query(
      `
      INSERT INTO property_notification_preferences (
        property_id,
        user_id,
        new_reviews,
        negative_reviews,
        guest_messages,
        campaign_performance,
        ai_agent_activity
      )
      VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE, FALSE)
      ON CONFLICT (property_id, user_id) DO NOTHING
      `,
      [req.auth.propertyId, req.auth.userId],
    );

    const prefs = await queryOne<{
      new_reviews: boolean;
      negative_reviews: boolean;
      guest_messages: boolean;
      campaign_performance: boolean;
      ai_agent_activity: boolean;
      updated_at: string;
    }>(
      `
      SELECT
        new_reviews,
        negative_reviews,
        guest_messages,
        campaign_performance,
        ai_agent_activity,
        updated_at
      FROM property_notification_preferences
      WHERE property_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [req.auth.propertyId, req.auth.userId],
    );

    ok(res, prefs);
  }),
);

settingsRouter.patch(
  "/v1.0/settings/notifications",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = patchNotificationsSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const payload = parsed.data;

    await query(
      `
      INSERT INTO property_notification_preferences (
        property_id,
        user_id,
        new_reviews,
        negative_reviews,
        guest_messages,
        campaign_performance,
        ai_agent_activity
      )
      VALUES (
        $1,
        $2,
        COALESCE($3, TRUE),
        COALESCE($4, TRUE),
        COALESCE($5, TRUE),
        COALESCE($6, TRUE),
        COALESCE($7, FALSE)
      )
      ON CONFLICT (property_id, user_id) DO UPDATE
      SET
        new_reviews = COALESCE($3, property_notification_preferences.new_reviews),
        negative_reviews = COALESCE($4, property_notification_preferences.negative_reviews),
        guest_messages = COALESCE($5, property_notification_preferences.guest_messages),
        campaign_performance = COALESCE($6, property_notification_preferences.campaign_performance),
        ai_agent_activity = COALESCE($7, property_notification_preferences.ai_agent_activity),
        updated_at = NOW()
      `,
      [
        req.auth.propertyId,
        req.auth.userId,
        payload.new_reviews ?? null,
        payload.negative_reviews ?? null,
        payload.guest_messages ?? null,
        payload.campaign_performance ?? null,
        payload.ai_agent_activity ?? null,
      ],
    );

    const prefs = await queryOne<{
      new_reviews: boolean;
      negative_reviews: boolean;
      guest_messages: boolean;
      campaign_performance: boolean;
      ai_agent_activity: boolean;
      updated_at: string;
    }>(
      `
      SELECT
        new_reviews,
        negative_reviews,
        guest_messages,
        campaign_performance,
        ai_agent_activity,
        updated_at
      FROM property_notification_preferences
      WHERE property_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [req.auth.propertyId, req.auth.userId],
    );

    ok(res, prefs);
  }),
);
