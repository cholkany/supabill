import { and, desc, eq } from "drizzle-orm";

import { db } from "@supabill/db";
import {
  managedRouter,
  managedRouterLog,
  managedRouterSetup,
  managedRouterStatusEnum,
  managedRouterWireguard,
} from "@supabill/db/schema";
import { env } from "@supabill/env/server";

import { decryptSecret, encryptSecret, generateRouterPassword } from "./router-crypto.js";
import { getRouterLiveSnapshot, probeRouter } from "./routeros-probe.js";
import { provisionWireguard, syncServerWireguardConf } from "./wireguard.js";
import { generateClaimCode } from "./router/claim-code.js";
import { boss } from "./jobs/queue.js";

type SetupStatus = (typeof managedRouterSetup.$inferSelect)["status"];
type RouterStatus = (typeof managedRouterStatusEnum.enumValues)[number];

type SetupStep = 1 | 2 | 3 | 4;

type RouterDashboardData = {
  id: string;
  name: string;
  location: string;
  status: RouterStatus | "online";
  wanPort: string;
  hotspotPorts: string[];
  createdAt: string;
  lastSeenAt: string;
  stats: {
    activeUsers: number;
    activeSessions: number;
    cpuLoadPercent: number;
    memoryUsagePercent: number;
    txMbps: number;
    rxMbps: number;
  };
  hotspotProfiles: Array<{
    id: string;
    name: string;
    rateLimit: string;
    sharedUsers: number;
    sessionTimeoutMinutes: number;
  }>;
  hotspotUsers: Array<{
    id: string;
    username: string;
    profile: string;
    status: "online" | "offline";
    uptime: string;
    ipAddress: string;
  }>;
  logs: Array<{
    id: string;
    level: "info" | "warning" | "error";
    message: string;
    timestamp: string;
  }>;
  systemMonitor: {
    uptime: string;
    temperatureC: number;
    voltage: number;
    firmware: string;
    routerOsVersion: string;
  };
  reports: {
    trafficTodayGb: number;
    trafficMonthGb: number;
    uniqueHotspotUsersToday: number;
  };
  settings: {
    timezone: string;
    dnsServers: string[];
    ntpServers: string[];
    alertingEnabled: boolean;
  };
};

function nowIso() {
  return new Date().toISOString();
}

// Every dashboard subpage calls getRouterDashboard; cache the live snapshot
// briefly so moving between tabs does not open a new RouterOS session.
const SNAPSHOT_TTL_MS = 10_000;
const snapshotCache = new Map<string, { at: number; data: RouterDashboardData }>();

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return nowIso();
  }
  return value instanceof Date ? value.toISOString() : value;
}

function toStep(status: SetupStatus): SetupStep {
  if (status === "completed") {
    return 4;
  }
  if (status === "reachable") {
    return 3;
  }
  return 2;
}

function getSetupLogMessage(message: string) {
  return `${nowIso()} ${message}`;
}

function normalizeHost(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const firstChunk = input.split(",")[0]?.trim() ?? "";
  if (!firstChunk) {
    return null;
  }

  if (firstChunk.startsWith("[")) {
    const end = firstChunk.indexOf("]");
    if (end > 0) {
      return firstChunk.slice(1, end);
    }
  }

  const colonCount = (firstChunk.match(/:/g) ?? []).length;
  if (colonCount === 1 && firstChunk.includes(".")) {
    return firstChunk.split(":")[0] ?? firstChunk;
  }

  return firstChunk;
}

function generateApiUsername(setupId: string) {
  return `supa_${setupId.replaceAll("-", "").slice(0, 10)}`;
}

function getProvisionBaseUrl(serverBaseUrl: string) {
  return (env.SERVER_PUBLIC_URL ?? serverBaseUrl).replace(/\/$/, "");
}

async function appendRouterLog(routerId: string, level: "info" | "warning" | "error", message: string) {
  await db.insert(managedRouterLog).values({
    id: crypto.randomUUID(),
    routerId,
    level,
    message,
  });
}

export async function listRoutersForUser(userId: string) {
  const rows = await db
    .select()
    .from(managedRouter)
    .where(eq(managedRouter.userId, userId))
    .orderBy(desc(managedRouter.createdAt));

  return rows.map((router) => ({
    id: router.id,
    name: router.name,
    location: router.location,
    status: router.status,
    wanPort: router.wanPort,
    hotspotPorts: router.hotspotPorts,
    createdAt: toIso(router.createdAt),
    updatedAt: toIso(router.updatedAt),
    lastSeenAt: toIso(router.lastSeenAt),
  }));
}

export async function startRouterSetup({
  userId,
  tenantId,
  routerName,
  location,
  serverBaseUrl,
}: {
  userId: string;
  tenantId: string;
  routerName: string;
  location: string;
  serverBaseUrl: string;
}) {
  const setupId = crypto.randomUUID();
  const provisionToken = crypto.randomUUID();
  const provisionUrl = `${getProvisionBaseUrl(serverBaseUrl)}/provision/${provisionToken}`;
  const apiUsername = generateApiUsername(setupId);
  const apiPassword = generateRouterPassword(26);
  const isNgrok = provisionUrl.includes("ngrok-free.app") || provisionUrl.includes("ngrok.io");
  const headers = isNgrok ? ' http-header-field="ngrok-skip-browser-warning:true"' : "";
  const provisionScript = [
    `/tool fetch mode=http url="${provisionUrl}"${headers} dst-path=supabill-setup.rsc`,
    "/import file-name=supabill-setup.rsc",
  ].join("; ");

  const routerId = crypto.randomUUID();

  await db.insert(managedRouterSetup).values({
    id: setupId,
    userId,
    tenantId,
    routerName,
    location,
    status: "provision_script_generated",
    step: 2,
    provisionToken,
    provisionUrl,
    provisionScript,
    apiUsername,
    apiPasswordEncrypted: encryptSecret(apiPassword),
    completedRouterId: null, // set to null initially to avoid cyclic foreign key issues
    setupLogs: [getSetupLogMessage(`Setup created for ${routerName}`)],
  });

  await db.insert(managedRouter).values({
    id: routerId,
    userId,
    tenantId,
    setupId: setupId,
    name: routerName,
    location,
    host: "10.100.1.1", // Temporary WireGuard fallback
    apiPort: 8728,
    apiUsername,
    apiPasswordEncrypted: encryptSecret(apiPassword),
    status: "pending",
    claimCode: generateClaimCode(),
    wanPort: "ether1",
    hotspotPorts: [],
    timezone: "Africa/Juba",
    dnsServers: ["1.1.1.1", "8.8.8.8"],
    ntpServers: ["pool.ntp.org"],
    lastSeenAt: new Date(),
  });

  await db.update(managedRouterSetup)
    .set({ completedRouterId: routerId })
    .where(eq(managedRouterSetup.id, setupId));

  await provisionWireguard(routerId, userId, new URL(serverBaseUrl).hostname);
  return {
    setupId,
    step: 2,
    provisionUrl,
    provisionScript,
    routerName,
    location,
    statusMessage: "Run the script on the router, then test router accessibility.",
  };
}

export async function getSetupById(setupId: string, userId: string) {
  const setup = await db.query.managedRouterSetup.findFirst({
    where: and(eq(managedRouterSetup.id, setupId), eq(managedRouterSetup.userId, userId)),
  });

  if (!setup) {
    return null;
  }

  let claimCode: string | null = null;
  let routerStatus: string | null = null;
  if (setup.completedRouterId) {
    const r = await db.query.managedRouter.findFirst({
      where: eq(managedRouter.id, setup.completedRouterId),
    });
    if (r) {
      claimCode = r.claimCode;
      routerStatus = r.status;
    }
  }

  return {
    setupId: setup.id,
    step: toStep(setup.status),
    routerName: setup.routerName,
    location: setup.location,
    provisionUrl: setup.provisionUrl,
    provisionScript: setup.provisionScript,
    provisionFetched: Boolean(setup.provisionFetchedAt),
    reachable: setup.status === "reachable" || setup.status === "completed",
    wanPort: "ether1",
    ports: setup.allPorts,
    hotspotCandidatePorts: setup.hotspotCandidatePorts,
    selectedHotspotPorts: setup.selectedHotspotPorts,
    completedRouterId: setup.completedRouterId,
    setupLogs: setup.setupLogs,
    claimCode,
    routerStatus,
  };
}

export async function markProvisionFetched({
  provisionToken,
  sourceHost,
}: {
  provisionToken: string;
  sourceHost?: string | null;
}) {
  const setup = await db.query.managedRouterSetup.findFirst({
    where: eq(managedRouterSetup.provisionToken, provisionToken),
  });

  if (!setup) {
    return null;
  }

  // Setup links are onboarding credentials; expire them after a day.
  if (Date.now() - setup.createdAt.getTime() > 24 * 60 * 60 * 1000) {
    return null;
  }

  const normalizedHost = normalizeHost(sourceHost);

  await db
    .update(managedRouterSetup)
    .set({
      status: setup.status === "provision_script_generated" ? "provision_fetched" : setup.status,
      provisionFetchedAt: setup.provisionFetchedAt ?? new Date(),
      detectedHost: normalizedHost ?? setup.detectedHost,
      setupLogs: [
        getSetupLogMessage(
          normalizedHost
            ? `Provision script fetched from router host ${normalizedHost}.`
            : "Provision script fetched from router.",
        ),
        ...setup.setupLogs,
      ],
      updatedAt: new Date(),
    })
    .where(eq(managedRouterSetup.id, setup.id));

  return {
    setupId: setup.id,
    apiUsername: setup.apiUsername,
    apiPassword: decryptSecret(setup.apiPasswordEncrypted),
    completedRouterId: setup.completedRouterId,
  };
}

export async function testSetupConnectivity({
  setupId,
  userId,
  hostOverride,
}: {
  setupId: string;
  userId: string;
  hostOverride?: string;
}) {
  const setup = await db.query.managedRouterSetup.findFirst({
    where: and(eq(managedRouterSetup.id, setupId), eq(managedRouterSetup.userId, userId)),
  });

  if (!setup) {
    return null;
  }

  let wgIp: string | null = null;
  if (setup.completedRouterId) {
    const wg = await db.query.managedRouterWireguard.findFirst({
      where: eq(managedRouterWireguard.routerId, setup.completedRouterId),
    });
    if (wg?.peerTunnelIp) {
      wgIp = wg.peerTunnelIp.split("/")[0] ?? null;  // MikroTik's tunnel address
    }
  }

  const host = normalizeHost(hostOverride) || wgIp || setup.detectedHost;
  if (!host) {
    return {
      error:
        "Router host is not known yet. Run the provision script on the router or provide a host before testing.",
    };
  }

  try {
    const probe = await probeRouter({
      host,
      port: setup.apiPort,
      username: setup.apiUsername,
      password: decryptSecret(setup.apiPasswordEncrypted),
    });

    const allPorts = probe.ports.filter((port) => port.length > 0);
    const wanPort = allPorts.includes("ether1") ? "ether1" : allPorts[0] ?? "ether1";
    const hotspotCandidatePorts = allPorts.filter((port) => port !== wanPort);

    await db
      .update(managedRouterSetup)
      .set({
        status: "reachable",
        step: 3,
        detectedHost: host,
        reachableAt: new Date(),
        allPorts,
        hotspotCandidatePorts,
        setupLogs: [
          getSetupLogMessage(`Router connectivity test passed. Identity: ${probe.identity}.`),
          ...setup.setupLogs,
        ],
        updatedAt: new Date(),
      })
      .where(eq(managedRouterSetup.id, setup.id));

    return {
      setupId: setup.id,
      reachable: true,
      statusMessage: "Router is reachable after script execution.",
      wanPort,
      ports: allPorts,
      hotspotCandidatePorts,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connectivity test failed.";
    await db
      .update(managedRouterSetup)
      .set({
        status: "failed",
        setupLogs: [getSetupLogMessage(`Connectivity test failed: ${message}`), ...setup.setupLogs],
        updatedAt: new Date(),
      })
      .where(eq(managedRouterSetup.id, setup.id));

    return { error: `Router connectivity test failed: ${message}` };
  }
}

export async function completeSetup({
  setupId,
  userId,
  tenantId,
  selectedHotspotPorts,
}: {
  setupId: string;
  userId: string;
  tenantId: string;
  selectedHotspotPorts: string[];
}) {
  const setup = await db.query.managedRouterSetup.findFirst({
    where: and(eq(managedRouterSetup.id, setupId), eq(managedRouterSetup.userId, userId)),
  });

  if (!setup) {
    return null;
  }

  // Double-click / retry: completing twice must not insert twice or queue two syncs.
  if (setup.status === "completed" && setup.completedRouterId) {
    return {
      setupId: setup.id,
      step: 4 as const,
      completed: true,
      routerId: setup.completedRouterId,
      statusMessage: "Router setup is already complete.",
    };
  }

  if (setup.status !== "reachable" && setup.status !== "completed") {
    return {
      error: "Run accessibility test before completing setup.",
    };
  }

  if (!setup.detectedHost) {
    return {
      error: "Router host was not detected. Test router accessibility first.",
    };
  }

  const validSet = new Set(setup.hotspotCandidatePorts);
  const normalized = [...new Set(selectedHotspotPorts)].filter((port) => validSet.has(port));

  if (normalized.length === 0) {
    return {
      error: "Select at least one hotspot bridge port.",
    };
  }

  const routerId = setup.completedRouterId ?? crypto.randomUUID();

  const routerAlreadyExists = await db.query.managedRouter.findFirst({
    where: eq(managedRouter.id, routerId),
  });

  if (!routerAlreadyExists) {
    await db.insert(managedRouter).values({
      id: routerId,
      userId,
      tenantId,
      setupId: setup.id,
      name: setup.routerName,
      location: setup.location,
      host: setup.detectedHost,
      apiPort: setup.apiPort,
      apiUsername: setup.apiUsername,
      apiPasswordEncrypted: setup.apiPasswordEncrypted,
      status: "pending",
      claimCode: generateClaimCode(),
      wanPort: "ether1",
      hotspotPorts: normalized,
      timezone: "Africa/Juba",
      dnsServers: ["1.1.1.1", "8.8.8.8"],
      ntpServers: ["pool.ntp.org"],
      lastSeenAt: new Date(),
    });
  } else {
    await db
      .update(managedRouter)
      .set({
        hotspotPorts: normalized,
        updatedAt: new Date(),
      })
      .where(eq(managedRouter.id, routerId));
  }

  await db
    .update(managedRouterSetup)
    .set({
      status: "completed",
      step: 4,
      selectedHotspotPorts: normalized,
      completedRouterId: routerId,
      setupLogs: [
        getSetupLogMessage("Setup completion requested. Configuration sync queued."),
        ...setup.setupLogs,
      ],
      updatedAt: new Date(),
    })
    .where(eq(managedRouterSetup.id, setup.id));

  await appendRouterLog(routerId, "info", "Router setup completed. Configuration sync queued.");

  await db
    .update(managedRouter)
    .set({ status: "syncing", lastError: null, updatedAt: new Date() })
    .where(eq(managedRouter.id, routerId));

  await boss.send("router-sync", { routerId });

  return {
    setupId: setup.id,
    step: 4 as const,
    completed: true,
    routerId,
    statusMessage: "Router setup completed and background configuration jobs started.",
  };
}

export async function getRouterDashboard({
  userId,
  routerId,
}: {
  userId: string;
  routerId: string;
}): Promise<RouterDashboardData | null> {
  const router = await db.query.managedRouter.findFirst({
    where: and(eq(managedRouter.id, routerId), eq(managedRouter.userId, userId)),
  });

  if (!router) {
    return null;
  }

  const cacheKey = `${userId}:${routerId}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) {
    return cached.data;
  }

  const routerLogs = await db.query.managedRouterLog.findMany({
    where: eq(managedRouterLog.routerId, router.id),
    orderBy: desc(managedRouterLog.createdAt),
    limit: 60,
  });

  let liveSnapshot: Awaited<ReturnType<typeof getRouterLiveSnapshot>> | null = null;

  try {
    liveSnapshot = await getRouterLiveSnapshot({
      host: router.host,
      port: router.apiPort,
      username: router.apiUsername,
      password: decryptSecret(router.apiPasswordEncrypted),
    });

    await db
      .update(managedRouter)
      .set({
        status: "ready",
        lastSeenAt: new Date(),
        lastProbeAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(managedRouter.id, router.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live probe failed.";
    await db
      .update(managedRouter)
      .set({
        status: "error",
        lastProbeAt: new Date(),
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(managedRouter.id, router.id));

    await appendRouterLog(router.id, "warning", `Live probe warning: ${message}`);
  }

  const activeUsers = liveSnapshot?.hotspotUsers.filter((user) => user.status === "online").length ?? 0;
  const logs = [
    ...routerLogs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      timestamp: toIso(log.createdAt),
    })),
    ...(liveSnapshot?.logs ?? []).map((log, index) => ({
      id: `${router.id}-live-${index}`,
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
    })),
  ].slice(0, 80);

  const data: RouterDashboardData = {
    id: router.id,
    name: router.name,
    location: router.location,
    status: liveSnapshot ? "online" : router.status,
    wanPort: router.wanPort,
    hotspotPorts: router.hotspotPorts,
    createdAt: toIso(router.createdAt),
    lastSeenAt: liveSnapshot ? nowIso() : toIso(router.lastSeenAt),
    stats: {
      activeUsers,
      activeSessions: Math.max(activeUsers, liveSnapshot?.hotspotUsers.length ?? 0),
      cpuLoadPercent: liveSnapshot?.cpuLoadPercent ?? 0,
      memoryUsagePercent: liveSnapshot?.memoryUsagePercent ?? 0,
      txMbps: liveSnapshot?.txMbps ?? 0,
      rxMbps: liveSnapshot?.rxMbps ?? 0,
    },
    hotspotProfiles: (liveSnapshot?.hotspotProfiles ?? []).map((profile, index) => ({
      id: `${router.id}-profile-${index}`,
      name: profile.name,
      rateLimit: profile.rateLimit,
      sharedUsers: profile.sharedUsers,
      sessionTimeoutMinutes: profile.sessionTimeoutMinutes,
    })),
    hotspotUsers: (liveSnapshot?.hotspotUsers ?? []).map((user, index) => ({
      id: `${router.id}-user-${index}`,
      username: user.username,
      profile: user.profile,
      status: user.status,
      uptime: user.uptime,
      ipAddress: user.ipAddress,
    })),
    logs,
    systemMonitor: {
      uptime: liveSnapshot?.uptime ?? "unknown",
      temperatureC: 0,
      voltage: 0,
      firmware: "RouterBOOT",
      routerOsVersion: "RouterOS",
    },
    reports: {
      trafficTodayGb: Number(((liveSnapshot?.txMbps ?? 0) * 0.28).toFixed(2)),
      trafficMonthGb: Number(((liveSnapshot?.txMbps ?? 0) * 8.4).toFixed(2)),
      uniqueHotspotUsersToday: activeUsers,
    },
    settings: {
      timezone: router.timezone,
      dnsServers: router.dnsServers,
      ntpServers: router.ntpServers,
      alertingEnabled: router.alertingEnabled,
    },
  };

  if (snapshotCache.size >= 500) snapshotCache.clear();
  snapshotCache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function deleteRouter(
  routerId: string,
  userId: string
): Promise<boolean> {
  const router = await db.query.managedRouter.findFirst({
    where: and(eq(managedRouter.id, routerId), eq(managedRouter.userId, userId)),
  });

  if (!router) {
    return false;
  }

  snapshotCache.delete(`${userId}:${routerId}`);
  await db.delete(managedRouter).where(eq(managedRouter.id, routerId));

  // The WireGuard row cascades with the router, but the peer stays in the
  // generated config / live interface until we rebuild it.
  try {
    await syncServerWireguardConf();
  } catch (error) {
    console.warn("[WireGuard] Failed to rebuild config after router delete:", error);
  }

  return true;
}



