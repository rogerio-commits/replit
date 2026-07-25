import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { db, usersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

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

async function fixDuplicateUsers() {
  // Find emails with more than one user record
  const duplicates = await db
    .select({ email: usersTable.email, cnt: count() })
    .from(usersTable)
    .groupBy(usersTable.email)
    .having(sql`count(*) > 1`);

  for (const { email } of duplicates) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .orderBy(usersTable.createdAt);

    if (rows.length < 2) continue;

    // Keep the most recent record, promote it to gestor if needed
    const newest = rows[rows.length - 1]!;
    const oldIds = rows.slice(0, -1).map((r) => r.id);

    if (newest.role !== "gestor") {
      await db
        .update(usersTable)
        .set({ role: "gestor" })
        .where(eq(usersTable.id, newest.id));
      logger.info({ email, id: newest.id }, "Promoted duplicate user to gestor");
    }

    for (const id of oldIds) {
      await db.delete(usersTable).where(eq(usersTable.id, id));
      logger.info({ email, id }, "Deleted stale duplicate user record");
    }
  }
}

async function main() {
  await fixDuplicateUsers();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startScheduler(logger);
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
