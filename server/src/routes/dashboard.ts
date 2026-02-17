import { Router } from "express";
import { query } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { resolveDateRange } from "../lib/date-range";
import { fail, ok } from "../lib/response";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/v1.0/dashboard/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : undefined;
    const { from, to } = resolveDateRange(range, undefined, undefined);

    const pendingReviewsLimit = Math.min(25, Number(req.query.pending_reviews_limit ?? 5) || 5);
    const activityLimit = Math.min(50, Number(req.query.activity_limit ?? 10) || 10);
    const scheduledPostsLimit = Math.min(25, Number(req.query.scheduled_posts_limit ?? 5) || 5);
    const propertyId = req.auth.propertyId;

    const [
      reviewCounts,
      messageCounts,
      socialStats,
      kpiLatest,
      pendingReviews,
      recentActivity,
      scheduledPosts,
      revenueSeries,
      aiSummary,
    ] = await Promise.all([
      query<{ pending_reviews: string }>(
        `
        SELECT COUNT(*)::text AS pending_reviews
        FROM reviews
        WHERE property_id = $1
          AND status IN ('pending', 'urgent')
        `,
        [propertyId],
      ),
      query<{ messages_today: string }>(
        `
        SELECT COUNT(*)::text AS messages_today
        FROM conversation_messages cm
        JOIN conversations c ON c.id = cm.conversation_id
        WHERE c.property_id = $1
          AND cm.sender = 'guest'
          AND cm.created_at >= date_trunc('day', NOW())
        `,
        [propertyId],
      ),
      query<{ total_reach: string; avg_engagement_rate: string }>(
        `
        SELECT
          COALESCE(SUM(COALESCE(actual_reach, estimated_reach, 0)), 0)::text AS total_reach,
          COALESCE(AVG(engagement_rate), 0)::text AS avg_engagement_rate
        FROM social_posts
        WHERE property_id = $1
          AND created_at BETWEEN $2 AND $3
        `,
        [propertyId, from.toISOString(), to.toISOString()],
      ),
      query<{ revpar: string | null; occupancy_rate: string | null; response_time_minutes: string | null }>(
        `
        SELECT revpar::text, occupancy_rate::text, response_time_minutes::text
        FROM property_metric_daily
        WHERE property_id = $1
        ORDER BY metric_date DESC
        LIMIT 1
        `,
        [propertyId],
      ),
      query<{
        id: string;
        platform: string;
        author_name: string;
        rating: number;
        title: string | null;
        body: string;
        status: string;
        reviewed_at: string;
        draft_content: string | null;
      }>(
        `
        SELECT
          r.id,
          r.platform::text AS platform,
          r.author_name,
          r.rating,
          r.title,
          r.body,
          r.status::text AS status,
          r.reviewed_at,
          rd.content AS draft_content
        FROM reviews r
        LEFT JOIN LATERAL (
          SELECT content
          FROM review_response_drafts rrd
          WHERE rrd.review_id = r.id
            AND rrd.is_current = TRUE
          ORDER BY rrd.version_no DESC
          LIMIT 1
        ) rd ON TRUE
        WHERE r.property_id = $1
          AND r.status IN ('pending', 'urgent')
        ORDER BY r.reviewed_at DESC, r.id DESC
        LIMIT $2
        `,
        [propertyId, pendingReviewsLimit],
      ),
      query<{
        id: string;
        action: string;
        details: string | null;
        status: string;
        started_at: string;
        agent_name: string | null;
      }>(
        `
        SELECT
          tr.id,
          tr.action,
          tr.details,
          tr.status::text AS status,
          tr.started_at,
          aa.name AS agent_name
        FROM ai_agent_task_runs tr
        LEFT JOIN ai_agents aa ON aa.id = tr.agent_id
        WHERE tr.property_id = $1
        ORDER BY tr.started_at DESC, tr.id DESC
        LIMIT $2
        `,
        [propertyId, activityLimit],
      ),
      query<{
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
        estimated_reach: number | null;
      }>(
        `
        SELECT id, title, status::text AS status, scheduled_at, estimated_reach
        FROM social_posts
        WHERE property_id = $1
          AND status IN ('scheduled', 'draft')
        ORDER BY scheduled_at ASC NULLS LAST, id ASC
        LIMIT $2
        `,
        [propertyId, scheduledPostsLimit],
      ),
      query<{ bucket: string; revenue: string; bookings: string }>(
        `
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW()) - interval '6 months',
            date_trunc('month', NOW()),
            interval '1 month'
          ) AS month_start
        ),
        revenue AS (
          SELECT
            date_trunc('month', metric_date)::date AS month_start,
            COALESCE(SUM(total_revenue), 0) AS revenue
          FROM property_metric_daily
          WHERE property_id = $1
            AND metric_date >= (date_trunc('month', NOW()) - interval '6 months')::date
          GROUP BY 1
        ),
        bookings AS (
          SELECT
            date_trunc('month', check_in)::date AS month_start,
            COUNT(*) AS bookings
          FROM bookings
          WHERE property_id = $1
            AND check_in >= (date_trunc('month', NOW()) - interval '6 months')::date
          GROUP BY 1
        )
        SELECT
          to_char(m.month_start, 'Mon') AS bucket,
          COALESCE(r.revenue, 0)::text AS revenue,
          COALESCE(b.bookings, 0)::text AS bookings
        FROM months m
        LEFT JOIN revenue r ON r.month_start = m.month_start::date
        LEFT JOIN bookings b ON b.month_start = m.month_start::date
        ORDER BY m.month_start ASC
        `,
        [propertyId],
      ),
      query<{ task_type: string; count: string; time_saved_seconds: string }>(
        `
        SELECT
          task_type,
          COUNT(*)::text AS count,
          COALESCE(SUM(COALESCE(time_saved_seconds, 0)), 0)::text AS time_saved_seconds
        FROM ai_agent_task_runs
        WHERE property_id = $1
          AND started_at >= NOW() - interval '24 hours'
          AND status = 'completed'
        GROUP BY task_type
        `,
        [propertyId],
      ),
    ]);

    const metrics = kpiLatest[0] ?? null;

    const aiSummaryMap = new Map<string, { task_type: string; count: string; time_saved_seconds: string }>();
    for (const row of aiSummary) {
      aiSummaryMap.set(row.task_type, row);
    }
    const totalTimeSaved = aiSummary.reduce((acc, row) => acc + Number(row.time_saved_seconds), 0);

    ok(res, {
      stats: {
        pendingReviews: Number(reviewCounts[0]?.pending_reviews ?? 0),
        messagesToday: Number(messageCounts[0]?.messages_today ?? 0),
        socialEngagement: Number(socialStats[0]?.total_reach ?? 0),
        revparUplift: Number(metrics?.revpar ?? 0),
        occupancy: Number(metrics?.occupancy_rate ?? 0),
        responseTimeMinutes: Number(metrics?.response_time_minutes ?? 0),
      },
      performanceSeries: revenueSeries.map((row) => ({
        month: row.bucket,
        revenue: Number(row.revenue),
        bookings: Number(row.bookings),
      })),
      pendingReviews: pendingReviews.map((row) => ({
        id: row.id,
        platform: row.platform,
        author: row.author_name,
        rating: row.rating,
        title: row.title,
        excerpt: row.body,
        aiResponse: row.draft_content,
        status: row.status,
        reviewedAt: row.reviewed_at,
      })),
      recentActivity: recentActivity.map((row) => ({
        id: row.id,
        title: row.action,
        description: row.details,
        status: row.status,
        timestamp: row.started_at,
        agent: row.agent_name,
      })),
      scheduledPosts: scheduledPosts.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        scheduledAt: row.scheduled_at,
        estimatedReach: row.estimated_reach,
      })),
      aiSummary: {
        reviewsReplied: Number(aiSummaryMap.get("reviews.reply")?.count ?? 0),
        postsScheduled: Number(aiSummaryMap.get("social.schedule")?.count ?? 0),
        messagesHandled: Number(aiSummaryMap.get("messages.reply")?.count ?? 0),
        timeSavedHours: Math.round((totalTimeSaved / 3600) * 10) / 10,
      },
    });
  }),
);
