import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  if (process.env["RESET_ON_STARTUP"] === "true") {
    logger.info("RESET_ON_STARTUP detected — truncating all tables");
    await db.execute(sql`
      TRUNCATE TABLE
        project_phase_history,
        project_observations,
        project_members,
        site_visits,
        checklist_items,
        sample_controls,
        assistencia_tecnica,
        installation_events,
        tasks,
        projects,
        invites,
        members
      RESTART IDENTITY CASCADE
    `);
    logger.info("Database truncated successfully");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
