import { boss } from "./queue.js";
import { syncRouterConfig } from "../router/router-sync.js";

export async function registerSyncJobHandler() {
  await boss.work<{ routerId: string }>("router-sync", async (job) => {
    const { routerId } = job.data;
    console.log(`[Job] Running config sync for router ${routerId}`);
    try {
      await syncRouterConfig(routerId);
      console.log(`[Job] Config sync completed successfully for router ${routerId}`);
    } catch (error) {
      console.error(`[Job] Config sync failed for router ${routerId}:`, error);
      throw error;
    }
  });
}
