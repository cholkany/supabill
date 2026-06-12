import { db } from "@supabill/db";
import { managedRouter, managedRouterWireguard, routerDesiredConfig, managedRouterLog } from "@supabill/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "../router-crypto.js";
import { generateConfig } from "../routeros/generate-config.js";
import { RouterOSAPI } from "node-routeros";

async function appendRouterLog(routerId: string, level: "info" | "warning" | "error", message: string) {
  await db.insert(managedRouterLog).values({
    id: crypto.randomUUID(),
    routerId,
    level,
    message,
  });
}

export async function syncRouterConfig(routerId: string): Promise<void> {
  // 1. Fetch router
  const router = await db.query.managedRouter.findFirst({
    where: eq(managedRouter.id, routerId),
  });
  if (!router) {
    throw new Error(`Router ${routerId} not found`);
  }

  // 2. Fetch WireGuard details
  const wg = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, routerId),
  });
  if (!wg) {
    throw new Error(`WireGuard config not found for router ${routerId}`);
  }

  // Transition status to syncing
  await db
    .update(managedRouter)
    .set({ status: "syncing", updatedAt: new Date() })
    .where(eq(managedRouter.id, routerId));

  await appendRouterLog(routerId, "info", "Starting configuration synchronization...");

  // 3. Get desired configuration
  const desired = await db.query.routerDesiredConfig.findFirst({
    where: eq(routerDesiredConfig.routerId, routerId),
  });

  const desiredState = desired
    ? desired.config
    : {
        dnsServers: router.dnsServers,
        ntpServers: router.ntpServers,
        timezone: router.timezone,
        hotspotPorts: router.hotspotPorts,
      };

  // 4. Generate RSC script
  const scriptContent = generateConfig(desiredState);

  // 5. Connect via WireGuard tunnel IP
  const tunnelIp = wg.peerTunnelIp.split("/")[0]!;
  const password = decryptSecret(router.apiPasswordEncrypted);

  const conn = new RouterOSAPI({
    host: tunnelIp,
    user: router.apiUsername,
    password,
    port: 8729, // Use API-SSL port 8729
    timeout: 12000,
    keepalive: false,
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });

  try {
    await conn.connect();
    
    // 6. Execute config script by adding it, running it, then deleting it
    const scriptName = "supabill-sync";

    // Clean up if it somehow existed previously
    await conn.write("/system/script/remove", ["=numbers=supabill-sync"]).catch(() => {});

    // Add script
    await conn.write("/system/script/add", [
      `=name=${scriptName}`,
      `=source=${scriptContent}`,
    ]);

    // Run script
    await conn.write("/system/script/run", [
      `=number=${scriptName}`,
    ]);

    // Remove script
    await conn.write("/system/script/remove", [
      `=numbers=${scriptName}`,
    ]);

    // Update status to ready
    await db
      .update(managedRouter)
      .set({
        status: "ready",
        lastError: null,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(managedRouter.id, routerId));

    await appendRouterLog(routerId, "info", "Configuration synchronization completed successfully.");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[RouterSync] Sync failed for router ${routerId}:`, errMsg);

    await db
      .update(managedRouter)
      .set({
        status: "error",
        lastError: errMsg,
        updatedAt: new Date(),
      })
      .where(eq(managedRouter.id, routerId));

    await appendRouterLog(routerId, "error", `Configuration synchronization failed: ${errMsg}`);
    throw error;
  } finally {
    await conn.close().catch(() => {});
  }
}
