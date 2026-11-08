import { startQueue } from "./queue.js";
import { registerProvisionJobHandler } from "./provision-router.js";
import { registerSyncJobHandler } from "./router-sync.js";

export async function initializeJobs(): Promise<void> {
  await startQueue();
  await registerProvisionJobHandler();
  await registerSyncJobHandler();
  console.log("[Jobs] All background jobs and workers registered successfully.");
}
