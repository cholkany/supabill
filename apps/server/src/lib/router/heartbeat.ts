import { db } from "@supabill/db";
import { managedRouter } from "@supabill/db/schema";
import { eq } from "drizzle-orm";

type UpdateHeartbeatParams = {
  routerId: string;
  cpuLoadPercent?: number;
  memoryUsagePercent?: number;
  routerOsVersion?: string;
};

export async function updateRouterHeartbeat(params: UpdateHeartbeatParams) {
  const { routerId, cpuLoadPercent, memoryUsagePercent, routerOsVersion } = params;

  const router = await db.query.managedRouter.findFirst({
    where: eq(managedRouter.id, routerId),
  });
  if (!router) {
    throw new Error(`Router ${routerId} not found`);
  }

  const updates: Record<string, any> = {
    lastHeartbeatAt: new Date(),
    lastSeenAt: new Date(),
  };

  if (cpuLoadPercent !== undefined) updates.cpuLoadPercent = cpuLoadPercent;
  if (memoryUsagePercent !== undefined) updates.memoryUsagePercent = memoryUsagePercent;
  if (routerOsVersion !== undefined) updates.routerOsVersion = routerOsVersion;

  // Transition status: if it was connecting/bootstrap_generated/error/pending, transition to connected.
  // If it was already ready/syncing, keep it as is.
  if (
    router.status === "connecting" ||
    router.status === "bootstrap_generated" ||
    router.status === "error" ||
    router.status === "pending"
  ) {
    updates.status = "connected";
  }

  await db.update(managedRouter).set(updates).where(eq(managedRouter.id, routerId));
}
