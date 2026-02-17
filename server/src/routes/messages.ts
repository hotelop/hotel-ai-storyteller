import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { fail, ok } from "../lib/response";
import { parsePagination, sanitizeSortBy } from "../lib/pagination";
import { resolveDateRange } from "../lib/date-range";

const sendSchema = z.object({
  content: z.string().min(1).max(4000),
  channel: z.enum(["whatsapp", "email", "sms", "booking"]).optional(),
});

const aiReplySchema = z.object({
  instruction: z.string().max(1000).optional(),
});

const quickActionSchema = z.object({
  action_key: z.enum(["confirm_booking", "send_checkin_info", "offer_upgrade", "request_review"]),
});

const conversationSortValues = ["last_message_at", "unread_count"] as const;

function quickActionText(action: z.infer<typeof quickActionSchema>["action_key"]): string {
  switch (action) {
    case "confirm_booking":
      return "Your booking is confirmed. We look forward to welcoming you.";
    case "send_checkin_info":
      return "Check-in starts at 3:00 PM and check-out is at 11:00 AM. Reply if you need early check-in.";
    case "offer_upgrade":
      return "We can offer an upgrade to a premium room for an additional nightly fee. Would you like details?";
    case "request_review":
      return "Thank you for staying with us. We'd appreciate it if you could share a quick review of your experience.";
  }
}

export const messagesRouter = Router();

messagesRouter.get(
  "/v1.0/messages/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "7d";
    const { from, to } = resolveDateRange(range, undefined, undefined);

    const [overview] = await query<{
      active_conversations: string;
      unread: string;
      ai_handled_pct: string;
      avg_response_minutes: string;
    }>(
      `
      WITH scoped AS (
        SELECT c.id, c.unread_count, c.status
        FROM conversations c
        WHERE c.property_id = $1
      ),
      ai_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE cm.sender = 'ai') AS ai_messages,
          COUNT(*) AS total_messages,
          AVG(COALESCE(atr.response_time_ms, 0)) AS avg_response_ms
        FROM conversation_messages cm
        JOIN conversations c ON c.id = cm.conversation_id
        LEFT JOIN ai_agent_task_runs atr
          ON atr.property_id = c.property_id
          AND atr.task_type = 'messages.reply'
          AND atr.started_at BETWEEN $2 AND $3
        WHERE c.property_id = $1
          AND cm.created_at BETWEEN $2 AND $3
      )
      SELECT
        COUNT(*) FILTER (WHERE scoped.status = 'open')::text AS active_conversations,
        COALESCE(SUM(scoped.unread_count), 0)::text AS unread,
        CASE
          WHEN ai_stats.total_messages = 0 THEN '0'
          ELSE ROUND((ai_stats.ai_messages::numeric / ai_stats.total_messages::numeric) * 100, 2)::text
        END AS ai_handled_pct,
        ROUND((COALESCE(ai_stats.avg_response_ms, 0) / 60000.0)::numeric, 2)::text AS avg_response_minutes
      FROM scoped, ai_stats
      `,
      [req.auth.propertyId, from.toISOString(), to.toISOString()],
    );

    ok(res, {
      activeConversations: Number(overview?.active_conversations ?? 0),
      unread: Number(overview?.unread ?? 0),
      aiHandledPct: Number(overview?.ai_handled_pct ?? 0),
      avgResponseMinutes: Number(overview?.avg_response_minutes ?? 0),
    });
  }),
);

messagesRouter.get(
  "/v1.0/messages/conversations",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor, sortDir } = parsePagination(req, 20, 100);
    const sortBy = sanitizeSortBy(req.query.sort_by, conversationSortValues, "last_message_at");
    const cursorToken = decodeCursor(cursor);

    const sortConfig: Record<(typeof conversationSortValues)[number], { expr: string; cast: string }> = {
      last_message_at: { expr: "COALESCE(c.last_message_at, c.created_at)", cast: "timestamptz" },
      unread_count: { expr: "c.unread_count", cast: "integer" },
    };

    const sortExpr = sortConfig[sortBy].expr;
    const compareOp = sortDir === "asc" ? ">" : "<";

    const params: unknown[] = [req.auth.propertyId];
    const where: string[] = ["c.property_id = $1"];

    const channels = Array.isArray(req.query.channel)
      ? req.query.channel.map(String)
      : typeof req.query.channel === "string"
        ? [req.query.channel]
        : [];

    if (channels.length > 0) {
      params.push(channels);
      where.push(`c.channel::text = ANY($${params.length}::text[])`);
    }

    if (req.query.unread_only === "true") {
      where.push("c.unread_count > 0");
    }

    if (typeof req.query.status === "string") {
      params.push(req.query.status);
      where.push(`c.status::text = $${params.length}`);
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(COALESCE(g.full_name, '') ILIKE $${params.length} OR COALESCE(c.last_message_preview, '') ILIKE $${params.length})`);
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
      channel: string;
      status: string;
      unread_count: number;
      last_message_at: string | null;
      last_message_preview: string | null;
      guest_name: string | null;
      booking_check_in: string | null;
      booking_check_out: string | null;
      sort_value: string | number;
    }>(
      `
      SELECT
        c.id,
        c.channel::text AS channel,
        c.status::text AS status,
        c.unread_count,
        c.last_message_at,
        c.last_message_preview,
        g.full_name AS guest_name,
        b.check_in::text AS booking_check_in,
        b.check_out::text AS booking_check_out,
        ${sortExpr} AS sort_value
      FROM conversations c
      LEFT JOIN guests g ON g.id = c.guest_id
      LEFT JOIN bookings b ON b.id = c.booking_id
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
        items: pageRows.map((row) => ({
          id: row.id,
          channel: row.channel,
          status: row.status,
          unreadCount: row.unread_count,
          lastMessageAt: row.last_message_at,
          lastMessagePreview: row.last_message_preview,
          guestName: row.guest_name,
          booking: row.booking_check_in && row.booking_check_out
            ? `${row.booking_check_in} - ${row.booking_check_out}`
            : null,
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

messagesRouter.get(
  "/v1.0/messages/conversations/:id",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const conversation = await queryOne<{
      id: string;
      channel: string;
      status: string;
      unread_count: number;
      guest_id: string | null;
      guest_name: string | null;
      booking_id: string | null;
      booking_check_in: string | null;
      booking_check_out: string | null;
      last_message_at: string | null;
      last_message_preview: string | null;
    }>(
      `
      SELECT
        c.id,
        c.channel::text AS channel,
        c.status::text AS status,
        c.unread_count,
        c.guest_id,
        g.full_name AS guest_name,
        c.booking_id,
        b.check_in::text AS booking_check_in,
        b.check_out::text AS booking_check_out,
        c.last_message_at,
        c.last_message_preview
      FROM conversations c
      LEFT JOIN guests g ON g.id = c.guest_id
      LEFT JOIN bookings b ON b.id = c.booking_id
      WHERE c.id = $1
        AND c.property_id = $2
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!conversation) {
      fail(res, "NOT_FOUND", "Conversation not found.", 404);
      return;
    }

    ok(res, conversation);
  }),
);

messagesRouter.get(
  "/v1.0/messages/conversations/:id/thread",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const { limit, cursor } = parsePagination(req, 30, 100);
    const sortDir = req.query.sort_dir === "asc" ? "asc" : "desc";
    const cursorToken = decodeCursor(cursor);

    const params: unknown[] = [req.params.id, req.auth.propertyId];
    const where: string[] = [
      `EXISTS (
        SELECT 1
        FROM conversations c
        WHERE c.id = cm.conversation_id
          AND c.id = $1
          AND c.property_id = $2
      )`,
      "cm.conversation_id = $1",
    ];

    const compareOp = sortDir === "asc" ? ">" : "<";

    if (cursorToken) {
      params.push(cursorToken.value);
      params.push(cursorToken.id);
      const valueParam = `$${params.length - 1}::timestamptz`;
      const idParam = `$${params.length}`;
      where.push(`((cm.created_at ${compareOp} ${valueParam}) OR (cm.created_at = ${valueParam} AND cm.id ${compareOp} ${idParam}))`);
    }

    params.push(limit + 1);

    const rows = await query<{
      id: string;
      sender: string;
      content: string;
      is_ai_generated: boolean;
      delivery_status: string;
      created_at: string;
    }>(
      `
      SELECT
        cm.id,
        cm.sender::text AS sender,
        cm.content,
        cm.is_ai_generated,
        cm.delivery_status::text AS delivery_status,
        cm.created_at
      FROM conversation_messages cm
      WHERE ${where.join(" AND ")}
      ORDER BY cm.created_at ${sortDir}, cm.id ${sortDir}
      LIMIT $${params.length}
      `,
      params,
    );

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const nextCursor = hasMore
      ? encodeCursor({
          value: pageRows[pageRows.length - 1]!.created_at,
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
        sort_by: "created_at",
        sort_dir: sortDir,
      },
    );
  }),
);

messagesRouter.post(
  "/v1.0/messages/conversations/:id/send",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const conversation = await queryOne<{ id: string }>(
      `SELECT id FROM conversations WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!conversation) {
      fail(res, "NOT_FOUND", "Conversation not found.", 404);
      return;
    }

    const message = await queryOne<{
      id: string;
      sender: string;
      content: string;
      created_at: string;
    }>(
      `
      INSERT INTO conversation_messages (
        conversation_id,
        sender,
        content,
        is_ai_generated,
        delivery_status,
        created_by
      )
      VALUES ($1, 'staff', $2, FALSE, 'sent', $3)
      RETURNING id, sender::text AS sender, content, created_at
      `,
      [conversation.id, parsed.data.content, req.auth.userId],
    );

    await query(
      `
      UPDATE conversations
      SET
        last_message_at = NOW(),
        last_message_preview = $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [conversation.id, parsed.data.content.slice(0, 500)],
    );

    ok(res, {
      ...message,
      channel: parsed.data.channel ?? null,
    }, undefined, 201);
  }),
);

messagesRouter.post(
  "/v1.0/messages/conversations/:id/ai-reply",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = aiReplySchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const conversation = await queryOne<{ id: string; guest_name: string | null; last_message_preview: string | null }>(
      `
      SELECT c.id, g.full_name AS guest_name, c.last_message_preview
      FROM conversations c
      LEFT JOIN guests g ON g.id = c.guest_id
      WHERE c.id = $1
        AND c.property_id = $2
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!conversation) {
      fail(res, "NOT_FOUND", "Conversation not found.", 404);
      return;
    }

    const aiContent = `Hi${conversation.guest_name ? ` ${conversation.guest_name}` : ""}, thanks for reaching out. ${parsed.data.instruction ?? "We are happy to help."}`;

    const message = await queryOne<{
      id: string;
      sender: string;
      content: string;
      created_at: string;
    }>(
      `
      INSERT INTO conversation_messages (
        conversation_id,
        sender,
        content,
        is_ai_generated,
        delivery_status,
        created_by
      )
      VALUES ($1, 'ai', $2, TRUE, 'sent', $3)
      RETURNING id, sender::text AS sender, content, created_at
      `,
      [conversation.id, aiContent, req.auth.userId],
    );

    await query(
      `
      UPDATE conversations
      SET
        last_message_at = NOW(),
        last_message_preview = $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [conversation.id, aiContent.slice(0, 500)],
    );

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
        $1,
        aa.id,
        'messages.reply',
        'Generated AI message reply',
        $2,
        'completed',
        NOW(),
        NOW(),
        1800,
        180,
        $3
      FROM ai_agents aa
      WHERE aa.property_id = $1
        AND aa.key = 'messaging'
      LIMIT 1
      `,
      [req.auth.propertyId, parsed.data.instruction ?? null, req.auth.userId],
    );

    ok(res, message, undefined, 201);
  }),
);

messagesRouter.post(
  "/v1.0/messages/conversations/:id/quick-action",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const parsed = quickActionSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, "VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.flatten());
      return;
    }

    const conversation = await queryOne<{ id: string }>(
      `SELECT id FROM conversations WHERE id = $1 AND property_id = $2 LIMIT 1`,
      [req.params.id, req.auth.propertyId],
    );

    if (!conversation) {
      fail(res, "NOT_FOUND", "Conversation not found.", 404);
      return;
    }

    const content = quickActionText(parsed.data.action_key);

    const message = await queryOne<{
      id: string;
      sender: string;
      content: string;
      created_at: string;
    }>(
      `
      INSERT INTO conversation_messages (
        conversation_id,
        sender,
        content,
        is_ai_generated,
        delivery_status,
        created_by
      )
      VALUES ($1, 'ai', $2, TRUE, 'sent', $3)
      RETURNING id, sender::text AS sender, content, created_at
      `,
      [conversation.id, content, req.auth.userId],
    );

    await query(
      `
      UPDATE conversations
      SET
        last_message_at = NOW(),
        last_message_preview = $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [conversation.id, content.slice(0, 500)],
    );

    ok(res, {
      actionKey: parsed.data.action_key,
      message,
    }, undefined, 201);
  }),
);

messagesRouter.get(
  "/v1.0/messages/conversations/:id/booking",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const booking = await queryOne<{
      id: string;
      check_in: string;
      check_out: string;
      room_type: string | null;
      booking_status: string;
      total_amount: string | null;
      currency_code: string;
      guest_name: string | null;
      guest_email: string | null;
      guest_phone: string | null;
    }>(
      `
      SELECT
        b.id,
        b.check_in::text,
        b.check_out::text,
        b.room_type,
        b.booking_status,
        b.total_amount::text,
        b.currency_code,
        g.full_name AS guest_name,
        g.email AS guest_email,
        g.phone AS guest_phone
      FROM conversations c
      JOIN bookings b ON b.id = c.booking_id
      LEFT JOIN guests g ON g.id = b.guest_id
      WHERE c.id = $1
        AND c.property_id = $2
      LIMIT 1
      `,
      [req.params.id, req.auth.propertyId],
    );

    if (!booking) {
      fail(res, "NOT_FOUND", "Booking not found for conversation.", 404);
      return;
    }

    ok(res, booking);
  }),
);
