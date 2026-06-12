import { startQueue } from "./queue.js";
import { registerProvisionJobHandler } from "./provision-router.js";
import { registerSyncJobHandler } from "./router-sync.js";
import { registerHeartbeatCheckJobHandler } from "./router-heartbeat-check.js";

export async function initializeJobs(): Promise<void> {
  try {
    await startQueue();
    await registerProvisionJobHandler();
    await registerSyncJobHandler();
    await registerHeartbeatCheckJobHandler();
    console.log("[Jobs] All background jobs and workers registered successfully.");
  } catch (error) {
    console.error("[Jobs] Failed to initialize background jobs:", error);
  }
}
