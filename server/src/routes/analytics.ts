import { Router } from "express";
import { query } from "../db";
import { asyncHandler } from "../lib/async-handler";
import { resolveDateRange } from "../lib/date-range";
import { fail, ok } from "../lib/response";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/v1.0/analytics/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "7d";
    const startDate = typeof req.query.start_date === "string" ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === "string" ? req.query.end_date : undefined;
    const { from, to } = resolveDateRange(range, startDate, endDate);

    const propertyId = req.auth.propertyId;

    const [kpiRows, revenueSeries, channelRows, sentimentRows] = await Promise.all([
      query<{
        revpar: string;
        occupancy_rate: string;
        avg_rating: string;
        response_time_minutes: string;
        total_revenue: string;
        ai_revenue_contribution: string;
        labor_cost_saved: string;
        revenue_attributed: string;
        time_saved_hours: string;
        roi_ratio: string;
      }>(
        `
        SELECT
          COALESCE(AVG(revpar), 0)::text AS revpar,
          COALESCE(AVG(occupancy_rate), 0)::text AS occupancy_rate,
          COALESCE(AVG(avg_rating), 0)::text AS avg_rating,
          COALESCE(AVG(response_time_minutes), 0)::text AS response_time_minutes,
          COALESCE(SUM(total_revenue), 0)::text AS total_revenue,
          COALESCE(SUM(ai_revenue_contribution), 0)::text AS ai_revenue_contribution,
          COALESCE(SUM(labor_cost_saved), 0)::text AS labor_cost_saved,
          COALESCE(SUM(revenue_attributed), 0)::text AS revenue_attributed,
          COALESCE(SUM(time_saved_hours), 0)::text AS time_saved_hours,
          COALESCE(AVG(roi_ratio), 0)::text AS roi_ratio
        FROM property_metric_daily
        WHERE property_id = $1
          AND metric_date BETWEEN $2::date AND $3::date
        `,
        [propertyId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
      ),
      query<{ month: string; revenue: string; ai_contribution: string }>(
        `
        SELECT
          to_char(date_trunc('month', metric_date), 'Mon') AS month,
          COALESCE(SUM(total_revenue), 0)::text AS revenue,
          COALESCE(SUM(ai_revenue_contribution), 0)::text AS ai_contribution
        FROM property_metric_daily
        WHERE property_id = $1
          AND metric_date BETWEEN $2::date AND $3::date
        GROUP BY date_trunc('month', metric_date)
        ORDER BY date_trunc('month', metric_date) ASC
        `,
        [propertyId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
      ),
      query<{ channel_name: string; value: string }>(
        `
        SELECT
          channel_name,
          COALESCE(AVG(percentage), 0)::text AS value
        FROM booking_channel_daily
        WHERE property_id = $1
          AND metric_date BETWEEN $2::date AND $3::date
        GROUP BY channel_name
        ORDER BY channel_name ASC
        `,
        [propertyId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
      ),
      query<{ rating: string; count: string }>(
        `
        SELECT
          CONCAT(rating, ' Stars') AS rating,
          COUNT(*)::text AS count
        FROM reviews
        WHERE property_id = $1
          AND reviewed_at BETWEEN $2 AND $3
        GROUP BY rating
        ORDER BY rating DESC
        `,
        [propertyId, from.toISOString(), to.toISOString()],
      ),
    ]);

    const kpi = kpiRows[0] ?? {
      revpar: "0",
      occupancy_rate: "0",
      avg_rating: "0",
      response_time_minutes: "0",
      total_revenue: "0",
      ai_revenue_contribution: "0",
      labor_cost_saved: "0",
      revenue_attributed: "0",
      time_saved_hours: "0",
      roi_ratio: "0",
    };

    const sentimentTotal = sentimentRows.reduce((acc, row) => acc + Number(row.count), 0);

    ok(res, {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      kpis: {
        revpar: Number(kpi.revpar),
        occupancy: Number(kpi.occupancy_rate),
        avgRating: Number(kpi.avg_rating),
        responseTimeMinutes: Number(kpi.response_time_minutes),
      },
      revenueAndAiContribution: revenueSeries.map((row) => ({
        month: row.month,
        revenue: Number(row.revenue),
        aiContribution: Number(row.ai_contribution),
      })),
      bookingChannels: channelRows.map((row) => ({
        name: row.channel_name,
        value: Number(row.value),
      })),
      reviewSentimentDistribution: sentimentRows.map((row) => ({
        rating: row.rating,
        count: Number(row.count),
        percentage: sentimentTotal > 0 ? Math.round((Number(row.count) / sentimentTotal) * 100) : 0,
      })),
      roiSummary: {
        timeSavedHours: Number(kpi.time_saved_hours),
        laborCostSaved: Number(kpi.labor_cost_saved),
        revenueAttributed: Number(kpi.revenue_attributed),
        roiRatio: Number(kpi.roi_ratio),
      },
    });
  }),
);

analyticsRouter.get(
  "/v1.0/analytics/report",
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      fail(res, "UNAUTHORIZED", "Missing auth context.", 401);
      return;
    }

    const format = req.query.format === "pdf" ? "pdf" : "csv";
    const range = typeof req.query.range === "string" ? req.query.range : "30d";
    const startDate = typeof req.query.start_date === "string" ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === "string" ? req.query.end_date : undefined;
    const { from, to } = resolveDateRange(range, startDate, endDate);

    const rows = await query<{
      metric_date: string;
      revpar: string | null;
      occupancy_rate: string | null;
      avg_rating: string | null;
      response_time_minutes: string | null;
      total_revenue: string | null;
      ai_revenue_contribution: string | null;
    }>(
      `
      SELECT
        metric_date::text,
        revpar::text,
        occupancy_rate::text,
        avg_rating::text,
        response_time_minutes::text,
        total_revenue::text,
        ai_revenue_contribution::text
      FROM property_metric_daily
      WHERE property_id = $1
        AND metric_date BETWEEN $2::date AND $3::date
      ORDER BY metric_date ASC
      `,
      [req.auth.propertyId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
    );

    if (format === "csv") {
      const header = "metric_date,revpar,occupancy_rate,avg_rating,response_time_minutes,total_revenue,ai_revenue_contribution";
      const lines = rows.map((r) =>
        [
          r.metric_date,
          r.revpar ?? "",
          r.occupancy_rate ?? "",
          r.avg_rating ?? "",
          r.response_time_minutes ?? "",
          r.total_revenue ?? "",
          r.ai_revenue_contribution ?? "",
        ].join(","),
      );

      ok(res, {
        format,
        fileName: `analytics-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`,
        contentType: "text/csv",
        content: [header, ...lines].join("\n"),
      });
      return;
    }

    ok(res, {
      format,
      fileName: `analytics-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.pdf`,
      message: "PDF rendering is not enabled yet. Use CSV export for now.",
      rows,
    });
  }),
);
