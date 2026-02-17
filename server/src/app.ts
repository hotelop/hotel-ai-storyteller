import express from "express";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { sharedRouter } from "./routes/shared";
import { dashboardRouter } from "./routes/dashboard";
import { socialRouter } from "./routes/social";
import { reviewsRouter } from "./routes/reviews";
import { messagesRouter } from "./routes/messages";
import { campaignsRouter } from "./routes/campaigns";
import { analyticsRouter } from "./routes/analytics";
import { settingsRouter } from "./routes/settings";
import { agentsRouter } from "./routes/agents";
import { requireAuth } from "./middleware/auth";
import { fail } from "./lib/response";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Public routes (compat auth flow)
  app.use(authRouter);

  // Protected routes
  app.use(requireAuth);
  app.use(usersRouter);
  app.use(sharedRouter);
  app.use(dashboardRouter);
  app.use(socialRouter);
  app.use(reviewsRouter);
  app.use(messagesRouter);
  app.use(campaignsRouter);
  app.use(analyticsRouter);
  app.use(settingsRouter);
  app.use(agentsRouter);

  app.use((_req, res) => {
    fail(res, "NOT_FOUND", "Endpoint not found.", 404);
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    fail(res, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.", 500);
  });

  return app;
}
