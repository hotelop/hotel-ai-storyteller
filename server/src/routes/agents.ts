import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { resolveDateRange } from "../lib/date-range";
import { fail, ok } from "../lib/response";
import { parsePagination, sanitizeSortBy } from "../lib/pagination";

const enabledSchema = z.object({
  enabled: z.boolean(),
});

const commandSchema = z.object({
  command: z.enum(["pause_all", "resume_all", "manual_sync"]),
});

const patchConfigSchema = z.object({
  auto_approve: z.boolean().optional(),
  max_tasks_per_hour: z.number().int().min(1).max(1000).optional(),
  priority_level: z.enum(["low", "medium", "high"]).optional(),
  notifications_enabled: z.boolean().optional(),
  retry_on_failure: z.boolean().optional(),
  max_retries: z.number().int().min(0).max(20).optional(),
});

const agentSortValues = ["name", "tasks_today", "success_rate", "avg_response_ms"] as const;
const activitySortValues = ["started_at", "status", "response_time_ms"] as const;

function toAgentStatus(enabled: boolean): "active" | "paused" {
  return enabled ? "active" : "paused";
}

export const agentsRouter = Router();

agentsRouter.get(
  "/v1.0/agents/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "24h";
    const { from, to } = resolveDateRange(range, undefined, undefined);

    const [row] = await query<{
      active_count: string;
      total_count: string;
      tasks: string;
      success_rate: string;
      time_saved_seconds: string;
    }>(
      `
      WITH agent_stats AS (
        SELECT
          aa.id,
          aa.enabled,
          COUNT(atr.id) FILTER (WHERE atr.started_at BETWEEN $2 AND $3) AS tasks,
          COUNT(atr.id) FILTER (WHERE atr.started_at BETWEEN $2 AND $3 AND atr.status = 'completed') AS completed,
          COALESCE(SUM(atr.time_saved_seconds) FILTER (WHERE atr.started_at BETWEEN $2 AND $3), 0) AS time_saved_seconds
        FROM ai_agents aa
        LEFT JOIN ai_agent_task_runs atr ON atr.agent_id = aa.id
        WHERE aa.property_id = $1
        GROUP BY aa.id, aa.enabled
      )
      SELECT
        COUNT(*) FILTER (WHERE enabled = TRUE)::text AS active_count,
        COUNT(*)::text AS total_count,
        COALESCE(SUM(tasks), 0)::text AS tasks,
        CASE
          WHEN COALESCE(SUM(tasks), 0) = 0 THEN '0'
          ELSE ROUND((SUM(completed)::numeric / SUM(tasks)::numeric) * 100, 2)::text
        END AS success_rate,
        COALESCE(SUM(time_saved_seconds), 0)::text AS time_saved_seconds
      FROM agent_stats
      `,
      [req.auth.propertyId, from.toISOString(), to.toISOString()],
    );

    ok(res, {
      activeAgents: Number(row?.active_count ?? 0),
      totalAgents: Number(row?.total_count ?? 0),
      tasks: Number(row?.tasks ?? 0),
      successRate: Number(row?.success_rate ?? 0),
      timeSavedHours: Math.round((Number(row?.time_saved_seconds ?? 0) / 3600) * 10) / 10,
    });
  }),
);

agentsRouter.get(
  "/v1.0/agents",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const sortBy = sanitizeSortBy(req.query.sort_by, agentSortValues, "name");
    const sortDir = req.query.sort_dir === "asc" ? "asc" : "desc";

    const rows = await query<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      status: string;
      enabled: boolean;
      tasks_today: string;
      success_rate: string;
      avg_response_ms: string;
    }>(
      `
      WITH metrics AS (
        SELECT
          aa.id,
          COUNT(atr.id) FILTER (WHERE atr.started_at >= date_trunc('day', NOW())) AS tasks_today,
          COUNT(atr.id) FILTER (WHERE atr.started_at >= date_trunc('day', NOW()) AND atr.status = 'completed') AS completed_today,
          COALESCE(AVG(atr.response_time_ms) FILTER (WHERE atr.started_at >= date_trunc('day', NOW())), 0) AS avg_response_ms
        FROM ai_agents aa
        LEFT JOIN ai_agent_task_runs atr ON atr.agent_id = aa.id
        WHERE aa.property_id = $1
        GROUP BY aa.id
      )
      SELECT
        aa.id,
        aa.key::text AS key,
        aa.name,
        aa.description,
        aa.status::text AS status,
        aa.enabled,
        COALESCE(m.tasks_today, 0)::text AS tasks_today,
        CASE
          WHEN COALESCE(m.tasks_today, 0) = 0 THEN '0'
          ELSE ROUND((m.completed_today::numeric / m.tasks_today::numeric) * 100, 2)::text
        END AS success_rate,
        COALESCE(m.avg_response_ms, 0)::text AS avg_response_ms
      FROM ai_agents aa
      LEFT JOIN metrics m ON m.id = aa.id
      WHERE aa.property_id = $1
        AND ($2::text IS NULL OR aa.status::text = $2)
        AND ($3::boolean IS NULL OR aa.enabled = $3)
      ORDER BY
        CASE WHEN $4 = 'name' THEN aa.name END ${sortDir},
        CASE WHEN $4 = 'tasks_today' THEN COALESCE(m.tasks_today, 0) END ${sortDir},
        CASE WHEN $4 = 'success_rate' THEN
          CASE WHEN COALESCE(m.tasks_today, 0) = 0 THEN 0 ELSE (m.completed_today::numeric / m.tasks_today::numeric) * 100 END
        END ${sortDir},
        CASE WHEN $4 = 'avg_response_ms' THEN COALESCE(m.avg_response_ms, 0) END ${sortDir},
        aa.name ASC
      `,
      [
        req.auth.propertyId,
        typeof req.query.status === "string" ? req.query.status : null,
        req.query.enabled === "true" ? true : req.query.enabled === "false" ? false : null,
        sortBy,
      ],
    );

    ok(res, {
      items: rows.map((row) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        status: row.status,
        enabled: row.enabled,
        metrics: {
          tasksToday: Number(row.tasks_today),
          successRate: Number(row.success_rate),
          avgResponseMs: Number(row.avg_response_ms),
        },
      })),
    }, {
      sort_by: sortBy,
      sort_dir: sortDir,
      has_more: false,
    });
  }),
);

agentsRouter.patch(
  "/v1.0/agents/:key/enabled",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = enabledSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const updated = await queryOne<{
      id: string;
      key: string;
      enabled: boolean;
      status: string;
      updated_at: string;
    }>(
      `
      UPDATE ai_agents
      SET enabled = $3,
          status = $4::agent_status,
          updated_at = NOW()
      WHERE property_id = $1
        AND key = $2::agent_key
      RETURNING id, key::text AS key, enabled, status::text AS status, updated_at
      `,
      [req.auth.propertyId, req.params.key, parsed.data.enabled, toAgentStatus(parsed.data.enabled)],
    );

    if (!updated) {
      fail(res, "NOT_FOUND", "Agent not found.", 404);
      return;
    }

    ok(res, updated);
  }),
);

agentsRouter.post(
  "/v1.0/agents/command",
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

    const command = parsed.data.command;

    if (command === "pause_all" || command === "resume_all") {
      const enabled = command === "resume_all";
      await query(
        `
        UPDATE ai_agents
        SET enabled = $2,
            status = $3::agent_status,
            updated_at = NOW()
        WHERE property_id = $1
        `,
        [req.auth.propertyId, enabled, enabled ? "active" : "paused"],
      );
    }

    if (command === "manual_sync") {
      await query(
        `
        INSERT INTO ai_agent_task_runs (
          property_id,
          agent_id,
          task_type,
          action,
          details,
          status,
          started_at,
          finished_at,
          response_time_ms,
          time_saved_seconds,
          created_by
        )
        SELECT
          aa.property_id,
          aa.id,
          aa.key::text || '.manual_sync' AS task_type,
          'Manual sync requested',
          'Triggered from dashboard command',
          'completed',
          NOW(),
          NOW(),
          500,
          60,
          $2
        FROM ai_agents aa
        WHERE aa.property_id = $1
          AND aa.enabled = TRUE
        `,
        [req.auth.propertyId, req.auth.userId],
      );
    }

    ok(res, {
      command,
      executedAt: new Date().toISOString(),
    });
  }),
);

agentsRouter.get(
  "/v1.0/agents/activity",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, activitySortValues, "started_at");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<(typeof activitySortValues)[number], { expr: string; cast: string }> = {
      started_at: { expr: "atr.started_at", cast: "timestamptz" },
      status: { expr: "atr.status::text", cast: "text" },
      response_time_ms: { expr: "COALESCE(atr.response_time_ms, 0)", cast: "integer" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const where: string[] = ["atr.property_id = $1"];
    const params: unknown[] = [req.auth.propertyId];

    const statuses = Array.isArray(req.query.status)
      ? req.query.status.map(String)
      : typeof req.query.status === "string"
        ? [req.query.status]
        : [];

    if (statuses.length > 0) {
      params.push(statuses);
      where.push(`atr.status::text = ANY($${params.length}::text[])`);
    }

    const keys = Array.isArray(req.query.agent_key)
      ? req.query.agent_key.map(String)
      : typeof req.query.agent_key === "string"
        ? [req.query.agent_key]
        : [];

    if (keys.length > 0) {
      params.push(keys);
      where.push(`aa.key::text = ANY($${params.length}::text[])`);
    }

    if (typeof req.query.date_from === "string") {
      params.push(req.query.date_from);
      where.push(`atr.started_at >= $${params.length}::timestamptz`);
    }

    if (typeof req.query.date_to === "string") {
      params.push(req.query.date_to);
      where.push(`atr.started_at <= $${params.length}::timestamptz`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(atr.action ILIKE $${params.length} OR COALESCE(atr.details, '') ILIKE $${params.length})`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::${sortConfig[sortBy].cast}`;
      const idParam = `$${params.length}`;
      where.push(`((${sortExpr} ${compareOp} ${valueParam}) OR (${sortExpr} = ${valueParam} AND atr.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      agent_key: string | null;
      agent_name: string | null;
      task_type: string;
      action: string;
      details: string | null;
      status: string;
      started_at: string;
      finished_at: string | null;
      response_time_ms: number | null;
      time_saved_seconds: number | null;
      sort_value: string | number;
    }>(
      `
      SELECT
        atr.id,
        aa.key::text AS agent_key,
        aa.name AS agent_name,
        atr.task_type,
        atr.action,
        atr.details,
        atr.status::text AS status,
        atr.started_at,
        atr.finished_at,
        atr.response_time_ms,
        atr.time_saved_seconds,
        ${sortExpr} AS sort_value
      FROM ai_agent_task_runs atr
      LEFT JOIN ai_agents aa ON aa.id = atr.agent_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpr} ${sortDir}, atr.id ${sortDir}
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

agentsRouter.get(
  "/v1.0/agents/:key/history",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const sortBy = sanitizeSortBy(req.query.sort_by, ["started_at"] as const, "started_at");
    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const cursorToken = decodeCursor(cursor);
    const compareOp = sortDir === "asc" ? ">" : "<";

    const params: unknown[] = [req.auth.propertyId, req.params.key];
    const where: string[] = [
      "atr.property_id = $1",
      "aa.key = $2::agent_key",
    ];

    if (typeof req.query.status === "string") {
      params.push(req.query.status);
      where.push(`atr.status::text = $${params.length}`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(atr.action ILIKE $${params.length} OR COALESCE(atr.details, '') ILIKE $${params.length})`);
    }

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::timestamptz`;
      const idParam = `$${params.length}`;
      where.push(`((atr.started_at ${compareOp} ${valueParam}) OR (atr.started_at = ${valueParam} AND atr.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      action: string;
      details: string | null;
      status: string;
      started_at: string;
      finished_at: string | null;
      response_time_ms: number | null;
    }>(
      `
      SELECT
        atr.id,
        atr.action,
        atr.details,
        atr.status::text AS status,
        atr.started_at,
        atr.finished_at,
        atr.response_time_ms
      FROM ai_agent_task_runs atr
      JOIN ai_agents aa ON aa.id = atr.agent_id
      WHERE ${where.join(" AND ")}
      ORDER BY atr.started_at ${sortDir}, atr.id ${sortDir}
      LIMIT $${params.length}
      `,
      params,
    );

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const nextCursor = hasMore
      ? encodeCursor({
          value: pageRows[pageRows.length - 1]!.started_at,
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

agentsRouter.get(
  "/v1.0/agents/:key/config",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const agent = await queryOne<{
      key: string;
      auto_approve: boolean;
      max_tasks_per_hour: number;
      priority_level: string;
      notifications_enabled: boolean;
      retry_on_failure: boolean;
      max_retries: number;
      enabled: boolean;
      status: string;
    }>(
      `
      SELECT
        key::text AS key,
        auto_approve,
        max_tasks_per_hour,
        priority_level::text AS priority_level,
        notifications_enabled,
        retry_on_failure,
        max_retries,
        enabled,
        status::text AS status
      FROM ai_agents
      WHERE property_id = $1
        AND key = $2::agent_key
      LIMIT 1
      `,
      [req.auth.propertyId, req.params.key],
    );

    if (!agent) {
      fail(res, "NOT_FOUND", "Agent not found.", 404);
      return;
    }

    ok(res, agent);
  }),
);

agentsRouter.patch(
  "/v1.0/agents/:key/config",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = patchConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const payload = parsed.data;

    const updated = await queryOne<{
      key: string;
      auto_approve: boolean;
      max_tasks_per_hour: number;
      priority_level: string;
      notifications_enabled: boolean;
      retry_on_failure: boolean;
      max_retries: number;
      updated_at: string;
    }>(
      `
      UPDATE ai_agents
      SET
        auto_approve = COALESCE($3, auto_approve),
        max_tasks_per_hour = COALESCE($4, max_tasks_per_hour),
        priority_level = COALESCE($5::agent_priority, priority_level),
        notifications_enabled = COALESCE($6, notifications_enabled),
        retry_on_failure = COALESCE($7, retry_on_failure),
        max_retries = COALESCE($8, max_retries),
        updated_at = NOW()
      WHERE property_id = $1
        AND key = $2::agent_key
      RETURNING
        key::text AS key,
        auto_approve,
        max_tasks_per_hour,
        priority_level::text AS priority_level,
        notifications_enabled,
        retry_on_failure,
        max_retries,
        updated_at
      `,
      [
        req.auth.propertyId,
        req.params.key,
        payload.auto_approve ?? null,
        payload.max_tasks_per_hour ?? null,
        payload.priority_level ?? null,
        payload.notifications_enabled ?? null,
        payload.retry_on_failure ?? null,
        payload.max_retries ?? null,
      ],
    );

    if (!updated) {
      fail(res, "NOT_FOUND", "Agent not found.", 404);
      return;
    }

    ok(res, updated);
  }),
);

agentsRouter.get(
  "/v1.0/agents/:key/statistics",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "7d";
    const { from, to } = resolveDateRange(range, undefined, undefined);

    const [summaryRows, trendRows] = await Promise.all([
      query<{
        total_tasks: string;
        completed_tasks: string;
        failed_tasks: string;
        avg_response_ms: string;
        time_saved_seconds: string;
      }>(
        `
        SELECT
          COUNT(*)::text AS total_tasks,
          COUNT(*) FILTER (WHERE atr.status = 'completed')::text AS completed_tasks,
          COUNT(*) FILTER (WHERE atr.status = 'failed')::text AS failed_tasks,
          COALESCE(AVG(atr.response_time_ms), 0)::text AS avg_response_ms,
          COALESCE(SUM(atr.time_saved_seconds), 0)::text AS time_saved_seconds
        FROM ai_agent_task_runs atr
        JOIN ai_agents aa ON aa.id = atr.agent_id
        WHERE atr.property_id = $1
          AND aa.key = $2::agent_key
          AND atr.started_at BETWEEN $3 AND $4
        `,
        [req.auth.propertyId, req.params.key, from.toISOString(), to.toISOString()],
      ),
      query<{ day: string; tasks: string; completed: string; failed: string }>(
        `
        SELECT
          to_char(date_trunc('day', atr.started_at), 'YYYY-MM-DD') AS day,
          COUNT(*)::text AS tasks,
          COUNT(*) FILTER (WHERE atr.status = 'completed')::text AS completed,
          COUNT(*) FILTER (WHERE atr.status = 'failed')::text AS failed
        FROM ai_agent_task_runs atr
        JOIN ai_agents aa ON aa.id = atr.agent_id
        WHERE atr.property_id = $1
          AND aa.key = $2::agent_key
          AND atr.started_at BETWEEN $3 AND $4
        GROUP BY date_trunc('day', atr.started_at)
        ORDER BY date_trunc('day', atr.started_at) ASC
        `,
        [req.auth.propertyId, req.params.key, from.toISOString(), to.toISOString()],
      ),
    ]);

    const summary = summaryRows[0] ?? {
      total_tasks: "0",
      completed_tasks: "0",
      failed_tasks: "0",
      avg_response_ms: "0",
      time_saved_seconds: "0",
    };

    const total = Number(summary.total_tasks);
    const completed = Number(summary.completed_tasks);

    ok(res, {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalTasks: total,
        avgTasksPerDay: trendRows.length > 0 ? Math.round(total / trendRows.length) : 0,
        failedTasks: Number(summary.failed_tasks),
        timeSavedHours: Math.round((Number(summary.time_saved_seconds) / 3600) * 10) / 10,
        successRate: total === 0 ? 0 : Math.round((completed / total) * 100),
        avgResponseMs: Number(summary.avg_response_ms),
      },
      trend: trendRows.map((row) => ({
        day: row.day,
        tasks: Number(row.tasks),
        completed: Number(row.completed),
        failed: Number(row.failed),
      })),
    });
  }),
);
