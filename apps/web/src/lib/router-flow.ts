import { env } from "@supabill/env/web";

export type RouterListItem = {
  id: string;
  name: string;
  location: string;
  status: "pending" | "bootstrap_generated" | "connecting" | "connected" | "syncing" | "ready" | "error";
  wanPort: string;
  hotspotPorts: string[];
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type RouterSetupStartResponse = {
  setupId: string;
  step: number;
  provisionUrl: string;
  provisionScript: string;
  routerName: string;
  location: string;
  statusMessage: string;
};

export type RouterSetupState = {
  setupId: string;
  step: number;
  routerName: string;
  location: string;
  provisionUrl: string;
  provisionScript: string;
  provisionFetched: boolean;
  reachable: boolean;
  wanPort: string;
  ports: string[];
  hotspotCandidatePorts: string[];
  selectedHotspotPorts: string[];
  completedRouterId: string | null;
  setupLogs: string[];
  claimCode: string | null;
  routerStatus: string | null;
};

export type RouterDashboardData = {
  id: string;
  name: string;
  location: string;
  status: "pending" | "bootstrap_generated" | "connecting" | "connected" | "syncing" | "ready" | "error";
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
    revenueToday: number;
    revenueMonth: number;
  };
  settings: {
    timezone: string;
    dnsServers: string[];
    ntpServers: string[];
    alertingEnabled: boolean;
  };
};

type RouterFetchInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  cookieHeader?: string;
};

async function routerFetch<T>(path: string, init: RouterFetchInit): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();

  if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window === "undefined" && init.cookieHeader && !headers.has("Cookie")) {
    headers.set("Cookie", init.cookieHeader);
  }

  const baseUrl = typeof window === "undefined" 
    ? (env.INTERNAL_SERVER_URL ?? env.NEXT_PUBLIC_SERVER_URL)
    : ""; // browser: use relative URL so middleware proxies to the server

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? (payload as { message?: string }).message
        : "Request failed";
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export async function getUserRouters(options?: { cookieHeader?: string }) {
  return routerFetch<{ routers: RouterListItem[] }>("/api/routers", {
    method: "GET",
    cookieHeader: options?.cookieHeader,
  });
}

export async function startRouterSetupStep1({
  routerName,
  location,
  cookieHeader,
}: {
  routerName: string;
  location: string;
  cookieHeader?: string;
}) {
  return routerFetch<RouterSetupStartResponse>("/api/routers/setup/start", {
    method: "POST",
    cookieHeader,
    body: JSON.stringify({ routerName, location }),
  });
}

export async function getRouterSetupState(setupId: string, options?: { cookieHeader?: string }) {
  return routerFetch<RouterSetupState>(`/api/routers/setup/${setupId}`, {
    method: "GET",
    cookieHeader: options?.cookieHeader,
  });
}

export async function testRouterSetupAccessibility(
  setupId: string,
  host?: string,
  options?: { cookieHeader?: string },
) {
  return routerFetch<{
    setupId: string;
    reachable: boolean;
    statusMessage: string;
    wanPort: string;
    ports: string[];
    hotspotCandidatePorts: string[];
  }>(`/api/routers/setup/${setupId}/test`, {
    method: "POST",
    cookieHeader: options?.cookieHeader,
    body: JSON.stringify({ host }),
  });
}

export async function completeRouterSetup({
  setupId,
  selectedHotspotPorts,
  cookieHeader,
}: {
  setupId: string;
  selectedHotspotPorts: string[];
  cookieHeader?: string;
}) {
  return routerFetch<{
    setupId: string;
    step: 4;
    completed: true;
    routerId: string;
    statusMessage: string;
  }>(`/api/routers/setup/${setupId}/complete`, {
    method: "POST",
    cookieHeader,
    body: JSON.stringify({ selectedHotspotPorts }),
  });
}

export async function getRouterDashboard(routerId: string, options?: { cookieHeader?: string }) {
  return routerFetch<RouterDashboardData>(`/api/routers/${routerId}`, {
    method: "GET",
    cookieHeader: options?.cookieHeader,
  });
}

// ── WireGuard ──────────────────────────────────────────────────────────────

export type WireguardStatus =
  | { configured: false }
  | {
      configured: true;
      status: "pending" | "applied" | "error";
      lastError: string | null;
      appliedAt: string | null;
      routerPublicKey: string;
      routerTunnelIp: string;
      peerPublicKey: string;
      peerTunnelIp: string;
      endpoint: string;
      listenPort: number;
      wanHost: string | null;
      clientConfig: string;
    };

export async function getWireguardStatus(
  routerId: string,
  options?: { cookieHeader?: string },
): Promise<WireguardStatus> {
  return routerFetch<WireguardStatus>(`/api/routers/${routerId}/wireguard`, {
    method: "GET",
    cookieHeader: options?.cookieHeader,
  });
}

export async function provisionRouterWireguard(
  routerId: string,
  wanHost?: string,
): Promise<{ success: true }> {
  return routerFetch<{ success: true }>(`/api/routers/${routerId}/wireguard/provision`, {
    method: "POST",
    body: JSON.stringify({ wanHost }),
  });
}

export type WireguardProbeResult = {
  configured: true;
  tunnelIp: string;
  wireguard:
    | { ok: false; reason: "no-interface" | "no-peer" | "exec-failed"; message?: string }
    | { ok: true; interfaceName: string; peerPublicKey: string; lastHandshakeAt: string | null };
  routerOs: { ok: boolean; identity?: string; error?: string };
  elapsedMs: number;
};

export async function probeRouterWireguard(routerId: string): Promise<WireguardProbeResult> {
  return routerFetch<WireguardProbeResult>(`/api/routers/${routerId}/wireguard/probe`, {
    method: "POST",
  });
}
