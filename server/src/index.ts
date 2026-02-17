import { createApp } from "./app";
import { config } from "./config";
import { closeDb } from "./db";

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`Hotel Ops API running on http://localhost:${config.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
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
