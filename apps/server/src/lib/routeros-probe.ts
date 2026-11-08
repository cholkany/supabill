import { RouterOSAPI } from "node-routeros";

import { env } from "@supabill/env/server";

type RouterConnectionInput = {
  host: string;
  port: number;
  username: string;
  password: string;
};

type ProbeResult = {
  identity: string;
  ports: string[];
  cpuLoadPercent: number;
  memoryUsagePercent: number;
  uptime: string;
};

export type RouterLiveSnapshot = ProbeResult & {
  hotspotProfiles: Array<{
    name: string;
    rateLimit: string;
    sharedUsers: number;
    sessionTimeoutMinutes: number;
  }>;
  hotspotUsers: Array<{
    username: string;
    profile: string;
    status: "online" | "offline";
    uptime: string;
    ipAddress: string;
  }>;
  logs: Array<{
    level: "info" | "warning" | "error";
    message: string;
    timestamp: string;
  }>;
  txMbps: number;
  rxMbps: number;
};

function pickString(item: Record<string, unknown>, key: string, fallback = "") {
  const value = item[key];
  return typeof value === "string" ? value : fallback;
}

function pickNumber(item: Record<string, unknown>, key: string, fallback = 0) {
  const value = item[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export type { RouterConnectionInput };

export async function connect(input: RouterConnectionInput) {
  const conn = new RouterOSAPI({
    host: input.host,
    user: input.username,
    password: input.password,
    port: input.port,
    timeout: env.ROUTER_API_TIMEOUT_MS,
    keepalive: false,
  });

  await conn.connect();
  return conn;
}

// Per-command timeout — shorter than the connection timeout.
// Required because node-routeros throws synchronously from event handlers on
// "!empty" replies (a library bug), which leaves conn.write()'s promise
// permanently unresolved. The race ensures safeWrite always settles.
const COMMAND_TIMEOUT_MS = Math.min(env.ROUTER_API_TIMEOUT_MS - 1000, 6000);

async function runCommand(
  conn: RouterOSAPI,
  command: string | string[],
  ...args: Array<string | string[]>
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`RouterOS command timed out: ${Array.isArray(command) ? command[0] : command}`)),
        COMMAND_TIMEOUT_MS,
      );
    });
    const response = await Promise.race([conn.write(command, ...args), timeout]);
    return Array.isArray(response) ? response : [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Required commands: a failure means the probe did not really succeed.
async function safeWrite(
  conn: RouterOSAPI,
  command: string | string[],
  ...args: Array<string | string[]>
) {
  return runCommand(conn, command, ...args);
}

// Optional commands (hotspot may not exist, traffic monitor may not be allowed):
// an empty reply is a valid answer, not an error.
async function safeWriteOptional(
  conn: RouterOSAPI,
  command: string | string[],
  ...args: Array<string | string[]>
) {
  try {
    return await runCommand(conn, command, ...args);
  } catch {
    return [];
  }
}

function normalizeRouterLogLevel(topics: string) {
  const lower = topics.toLowerCase();
  if (lower.includes("warning")) {
    return "warning" as const;
  }
  if (lower.includes("error") || lower.includes("critical")) {
    return "error" as const;
  }
  return "info" as const;
}

export async function probeRouter(input: RouterConnectionInput): Promise<ProbeResult> {
  const conn = await connect(input);

  try {
    const identityData = await safeWrite(conn, "/system/identity/print");
    const resourceData = await safeWrite(conn, "/system/resource/print");
    const ethernetData = await safeWrite(conn, "/interface/ethernet/print");

    const identity = pickString(identityData[0] ?? {}, "name", input.host);
    const resource = resourceData[0] ?? {};

    const cpuLoadPercent = pickNumber(resource, "cpu-load", 0);
    const freeMemory = pickNumber(resource, "free-memory", 0);
    const totalMemory = pickNumber(resource, "total-memory", 1);
    const memoryUsagePercent =
      totalMemory > 0 ? Math.round(((totalMemory - freeMemory) / totalMemory) * 100) : 0;
    const uptime = pickString(resource, "uptime", "unknown");

    const ports = ethernetData
      .map((item) => pickString(item, "name"))
      .filter((name) => name.length > 0);

    return {
      identity,
      ports,
      cpuLoadPercent,
      memoryUsagePercent,
      uptime,
    };
  } finally {
    await conn.close().catch(() => undefined);
  }
}

export async function getRouterLiveSnapshot(input: RouterConnectionInput): Promise<RouterLiveSnapshot> {
  const conn = await connect(input);

  try {
    const [identityData, resourceData, ethernetData, profileData, activeData, logData, trafficData] =
      await Promise.all([
        safeWrite(conn, "/system/identity/print"),
        safeWrite(conn, "/system/resource/print"),
        safeWrite(conn, "/interface/ethernet/print"),
        safeWriteOptional(conn, "/ip/hotspot/user/profile/print"),
        safeWriteOptional(conn, "/ip/hotspot/active/print"),
        safeWriteOptional(conn, "/log/print", "=count-only=no"),
        safeWriteOptional(conn, ["/interface/monitor-traffic", "=interface=all", "=once="]),
      ]);

    const resource = resourceData[0] ?? {};
    const cpuLoadPercent = pickNumber(resource, "cpu-load", 0);
    const freeMemory = pickNumber(resource, "free-memory", 0);
    const totalMemory = pickNumber(resource, "total-memory", 1);
    const memoryUsagePercent =
      totalMemory > 0 ? Math.round(((totalMemory - freeMemory) / totalMemory) * 100) : 0;

    const txBits = trafficData.reduce((sum, item) => sum + pickNumber(item, "tx-bits-per-second", 0), 0);
    const rxBits = trafficData.reduce((sum, item) => sum + pickNumber(item, "rx-bits-per-second", 0), 0);

    const hotspotProfiles = profileData.map((item) => ({
      name: pickString(item, "name", "default"),
      rateLimit: pickString(item, "rate-limit", "unlimited"),
      sharedUsers: pickNumber(item, "shared-users", 1),
      sessionTimeoutMinutes: Math.max(0, Math.round(pickNumber(item, "session-timeout", 0) / 60)),
    }));

    const hotspotUsers = activeData.map((item) => ({
      username: pickString(item, "user", "unknown"),
      profile: pickString(item, "user-profile", "default"),
      status: "online" as const,
      uptime: pickString(item, "uptime", "0s"),
      ipAddress: pickString(item, "address", "-"),
    }));

    const logs = logData.slice(0, 50).map((item) => ({
      level: normalizeRouterLogLevel(pickString(item, "topics", "")),
      message: pickString(item, "message", ""),
      timestamp: pickString(item, "time", new Date().toISOString()),
    }));

    return {
      identity: pickString(identityData[0] ?? {}, "name", input.host),
      ports: ethernetData
        .map((item) => pickString(item, "name"))
        .filter((name) => name.length > 0),
      cpuLoadPercent,
      memoryUsagePercent,
      uptime: pickString(resource, "uptime", "unknown"),
      hotspotProfiles,
      hotspotUsers,
      logs,
      txMbps: Number((txBits / 1_000_000).toFixed(2)),
      rxMbps: Number((rxBits / 1_000_000).toFixed(2)),
    };
  } finally {
    await conn.close().catch(() => undefined);
  }
}
