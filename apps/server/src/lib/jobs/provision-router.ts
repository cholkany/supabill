import { boss } from "./queue.js";
import { syncRouterConfig } from "../router/router-sync.js";

export async function registerProvisionJobHandler() {
  await boss.work<{ routerId: string }>("router-provision", async (job) => {
    const { routerId } = job.data;
    console.log(`[Job] Starting provisioning for router ${routerId}`);
    try {
      await syncRouterConfig(routerId);
      console.log(`[Job] Provisioning completed successfully for router ${routerId}`);
    } catch (error) {
      console.error(`[Job] Provisioning failed for router ${routerId}:`, error);
      throw error;
    }
  });
}
