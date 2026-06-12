import { db } from "@supabill/db";
import { managedRouter } from "@supabill/db/schema";
import { and, lt, notInArray } from "drizzle-orm";
import { boss } from "./queue.js";

export async function registerHeartbeatCheckJobHandler() {
  await boss.work("router-heartbeat-check", async () => {
    console.log("[Job] Running heartbeat check for offline routers...");
    const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    const offlineRouters = await db
      .update(managedRouter)
      .set({
        status: "error",
        lastError: "Heartbeat lost (offline for more than 5 minutes)",
        updatedAt: new Date(),
      })
      .where(
        and(
          lt(managedRouter.lastSeenAt, threshold),
          notInArray(managedRouter.status, ["pending", "bootstrap_generated", "error"])
        )
      )
      .returning({ id: managedRouter.id });

    if (offlineRouters.length > 0) {
      console.log(`[Job] Marked ${offlineRouters.length} routers as offline/error:`, offlineRouters.map((r) => r.id));
    }
  });

  try {
    await boss.schedule("router-heartbeat-check", "*/1 * * * *");
    console.log("[PgBoss] Scheduled router-heartbeat-check cron job (every minute).");
  } catch (error) {
    console.warn("[PgBoss] Failed to schedule cron (may already be scheduled):", error);
  }
}
