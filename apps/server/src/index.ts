import { auth } from "@supabill/auth";
import { env, getTrustedOrigins } from "@supabill/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getPlatformSnapshot, getTenantBySlug, getWireguardClientConfig } from "./lib/platform.js";
import {
  completeSetup,
  deleteRouter,
  getRouterDashboard,
  getSetupById,
  listRoutersForUser,
  markProvisionFetched,
  startRouterSetup,
  testSetupConnectivity,
} from "./lib/router-flow.js";
import {
  ensureWireguardInterfaceUpFromDisk,
  getWireguardStatus,
  getWireguardScriptForRouter,
  probeWireguardAndRouter,
  provisionWireguard,
} from "./lib/wireguard.js";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

import { initializeJobs } from "./lib/jobs/index.js";
import { routerHeartbeatRoute } from "./routes/router-heartbeat.js";
import { routerBootstrapRoute } from "./routes/router-bootstrap.js";
import { routerRegisterRoute } from "./routes/router-register.js";

// node-routeros@1.6.9 throws synchronously from TCP socket event handlers when
// RouterOS returns an "!empty" word (library bug: treats it as an unknown reply).
// Because throws inside EventEmitter callbacks bypass all promise try-catch, the
// only interception point is here. The RosException is non-fatal — the dashboard
// will return with whatever data was already collected before the crash point.
process.on("uncaughtException", (error) => {
  // RosException carries an `errno` string property; use that as the fingerprint.
  if (error && typeof error === "object" && "errno" in error) {
    console.error(`[RouterOS] Non-fatal library exception (errno=${(error as { errno: string }).errno}): ${(error as Error).message}`);
    return; // absorb — do NOT call process.exit()
  }
  // Re-surface genuinely fatal errors.
  console.error("[Fatal] Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Warning] Unhandled rejection:", reason);
});

const app = new Hono();
const exec = promisify(execCb);

// Best-effort: if a WG config already exists on disk, bring the interface up.
// This makes `docker compose up` testable without first provisioning a router.
void ensureWireguardInterfaceUpFromDisk();
void initializeJobs();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: getTrustedOrigins(),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
  }),
);

// Register custom Hono sub-routers
app.route("/router/heartbeat", routerHeartbeatRoute);
app.route("/bootstrap", routerBootstrapRoute);
app.route("/router/register", routerRegisterRoute);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

async function requireAuthenticatedUser(c: { req: { raw: Request } }) {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
      query: {
        disableCookieCache: true,
      },
    });

    if (!session?.user?.id) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

app.get("/api/platform/overview", async (c) => {
  const snapshot = await getPlatformSnapshot();
  return c.json(snapshot);
});

app.get("/api/platform/tenant/:slug", async (c) => {
  const tenant = await getTenantBySlug(c.req.param("slug"));

  if (!tenant) {
    return c.json({ message: "Tenant not found" }, 404);
  }

  return c.json(tenant);
});

app.get("/api/platform/wireguard/:routerId/:peerId", async (c) => {
  const config = await getWireguardClientConfig(c.req.param("routerId"), c.req.param("peerId"));

  if (!config) {
    return c.json({ message: "WireGuard peer not found" }, 404);
  }

  return c.json(config);
});

// Dev-only: verify WG interface state inside the running container.
app.get("/api/debug/wireguard", async (c) => {
  if (env.NODE_ENV === "production" && process.env.DEBUG_WIREGUARD !== "1") {
    return c.json({ message: "Not found." }, 404);
  }

  try {
    const [wg, ip] = await Promise.all([
      exec("wg show", { timeout: 4000 }),
      exec("ip addr show && ip route show", { timeout: 4000 }),
    ]);
    return c.json({
      wg: wg.stdout || wg.stderr,
      ip: ip.stdout || ip.stderr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "debug command failed";
    return c.json({ message }, 500);
  }
});

app.get("/api/routers", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) {
    return c.json({ message: "Authentication required." }, 401);
  }

  const routers = await listRoutersForUser(user.id);
  return c.json({ routers });
});

app.post("/api/routers/setup/start", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) {
    return c.json({ message: "Authentication required." }, 401);
  }

  let body: { routerName?: string; location?: string } = {};
  try {
    body = await c.req.json<{ routerName?: string; location?: string }>();
  } catch {
    body = {};
  }
  const routerName = body.routerName?.trim();
  const location = body.location?.trim();

  if (!routerName || !location) {
    return c.json({ message: "routerName and location are required." }, 400);
  }

  const forwardedHost = c.req.header("x-forwarded-host");
  const forwardedProto = c.req.header("x-forwarded-proto") ?? "http";
  const serverBaseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(c.req.url).origin;

  const setup = await startRouterSetup({
    userId: user.id,
    routerName,
    location,
    serverBaseUrl,
  });
  return c.json(setup);
});

app.get("/api/routers/setup/:setupId", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) {
    return c.json({ message: "Authentication required." }, 401);
  }

  const setup = await getSetupById(c.req.param("setupId"), user.id);
  if (!setup) {
    return c.json({ message: "Setup not found." }, 404);
  }

  return c.json(setup);
});

app.post("/api/routers/setup/:setupId/test", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) {
    return c.json({ message: "Authentication required." }, 401);
  }

  let body: { host?: string } = {};
  try {
    body = await c.req.json<{ host?: string }>();
  } catch {
    body = {};
  }

  const setup = await testSetupConnectivity({
    setupId: c.req.param("setupId"),
    userId: user.id,
    hostOverride: body.host,
  });

  if (!setup) {
    return c.json({ message: "Setup not found." }, 404);
  }
  if ("error" in setup) {
    return c.json({ message: setup.error }, 400);
  }
  return c.json(setup);
});

app.post("/api/routers/setup/:setupId/complete", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) {
    return c.json({ message: "Authentication required." }, 401);
  }

  let body: { selectedHotspotPorts?: string[] } = {};
  try {
    body = await c.req.json<{ selectedHotspotPorts?: string[] }>();
  } catch {
    body = {};
  }
  const result = await completeSetup({
    setupId: c.req.param("setupId"),
    userId: user.id,
    selectedHotspotPorts: Array.isArray(body.selectedHotspotPorts) ? body.selectedHotspotPorts : [],
  });

  if (!result) {
    return c.json({ message: "Setup not found." }, 404);
  }

  if ("error" in result) {
    return c.json({ message: result.error }, 400);
  }

  return c.json(result);
});

app.get("/api/routers/:routerId", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) {
    return c.json({ message: "Authentication required." }, 401);
  }

  const router = await getRouterDashboard({ userId: user.id, routerId: c.req.param("routerId") });
  if (!router) {
    return c.json({ message: "Router not found." }, 404);
  }

  return c.json(router);
});

app.delete("/api/routers/:routerId", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) return c.json({ message: "Authentication required." }, 401);

  const deleted = await deleteRouter(c.req.param("routerId"), user.id);
  if (!deleted) return c.json({ message: "Router not found." }, 404);

  return c.json({ success: true });
});


// ── WireGuard remote access ────────────────────────────────────────────────

app.get("/api/routers/:routerId/wireguard", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) return c.json({ message: "Authentication required." }, 401);

  const status = await getWireguardStatus(c.req.param("routerId"), user.id);
  if (!status) return c.json({ message: "Router not found." }, 404);
  return c.json(status);
});

app.post("/api/routers/:routerId/wireguard/provision", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) return c.json({ message: "Authentication required." }, 401);

  let body: { wanHost?: string } = {};
  try { body = await c.req.json<{ wanHost?: string }>(); } catch { /* empty body ok */ }

  const result = await provisionWireguard(
    c.req.param("routerId"),
    user.id,
    body.wanHost?.trim() || undefined,
  );

  if ("error" in result) return c.json({ message: result.error }, 400);
  return c.json(result);
});

app.post("/api/routers/:routerId/wireguard/probe", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) return c.json({ message: "Authentication required." }, 401);

  const result = await probeWireguardAndRouter(c.req.param("routerId"), user.id);
  if (!result) return c.json({ message: "Router not found." }, 404);
  if ("configured" in result && result.configured === false) {
    return c.json({ message: "WireGuard not configured for this router." }, 400);
  }
  return c.json(result);
});

app.get("/api/routers/:routerId/wireguard/client-config", async (c) => {
  const user = await requireAuthenticatedUser(c);
  if (!user) return c.json({ message: "Authentication required." }, 401);

  const status = await getWireguardStatus(c.req.param("routerId"), user.id);
  if (!status || !status.configured) return c.json({ message: "WireGuard not configured." }, 404);

  c.header("Content-Type", "text/plain");
  c.header("Content-Disposition", `attachment; filename="supabill-wg.conf"`);
  return c.body((status as { clientConfig: string }).clientConfig);
});

app.get("/provision/:provisionToken", async (c) => {
  const provisionToken = c.req.param("provisionToken");
  const sourceHostHeader = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip");

  const provisioned = await markProvisionFetched({
    provisionToken,
    sourceHost: sourceHostHeader,
  });

  if (!provisioned) {
    return c.text("# setup not found", 404);
  }

  const wgScript = provisioned.completedRouterId
    ? await getWireguardScriptForRouter(provisioned.completedRouterId)
    : null;

  const script = [
    "/log info \"Supabill provision started\"",
    "/ip service set api disabled=no",
    "/ip service set api port=8728",
    "/ip service set api-ssl disabled=yes",
    `/user remove [find name="${provisioned.apiUsername}"]`,
    `/user add name="${provisioned.apiUsername}" password="${provisioned.apiPassword}" group=full disabled=no`,
    wgScript,
    "/system note set show-at-login=yes note=\"Managed by Supabill\"",
    `/log info \"Supabill setup ${provisioned.setupId} ready\"`,
    `/log info \"Supabill API user ${provisioned.apiUsername} provisioned\"`,
    "/log info \"Supabill provision completed\"",
  ].filter(Boolean).join("\n");

  c.header("content-type", "text/plain");
  return c.body(script);
});

app.get("/", (c) => {
  return c.json({
    name: "supabill API",
    status: "ok",
    version: "0.1.0",
    endpoints: [
      "/api/auth/*",
      "/api/platform/overview",
      "/api/platform/tenant/:slug",
      "/api/platform/wireguard/:routerId/:peerId",
      "/api/routers",
      "/api/routers/setup/start",
      "/api/routers/setup/:setupId",
      "/api/routers/setup/:setupId/test",
      "/api/routers/setup/:setupId/complete",
      "/api/routers/:routerId",
      "/api/routers/:routerId/wireguard/probe",
      "/provision/:provisionToken",
    ],
  });
});

import { serve } from "@hono/node-server";

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
