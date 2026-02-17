import { createApp } from "./app";
import { config } from "./config";
import { assertDbReady, closeDb } from "./db";

let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;

async function bootstrap() {
  try {
    await assertDbReady();
  } catch (error) {
    console.error("Database readiness check failed.", error);
    process.exit(1);
    return;
  }

  const app = createApp();
  server = app.listen(config.PORT, () => {
    console.log(`Hotel Ops API running on http://localhost:${config.PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down...`);
  if (!server) {
    await closeDb();
    process.exit(0);
    return;
  }

  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void bootstrap();
