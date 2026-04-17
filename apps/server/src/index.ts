import { auth } from "@supabill/auth";
import { env } from "@supabill/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getPlatformSnapshot, getTenantBySlug, getWireguardClientConfig } from "./lib/platform.js";
import {
  completeSetup,
  getRouterDashboard,
  getSetupById,
  listRoutersForUser,
  markProvisionFetched,
  startRouterSetup,
  testSetupConnectivity,
} from "./lib/router-flow.js";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

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

  const serverBaseUrl = new URL(c.req.url).origin;
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

  const script = [
    "/log info \"Supabill provision started\"",
    "/ip service set api disabled=no",
    "/ip service set api port=8728",
    "/ip service set api-ssl disabled=yes",
    `/user remove [find name="${provisioned.apiUsername}"]`,
    `/user add name="${provisioned.apiUsername}" password="${provisioned.apiPassword}" group=full disabled=no`,
    "/system note set show-at-login=yes note=\"Managed by Supabill\"",
    `/log info \"Supabill setup ${provisioned.setupId} ready\"`,
    `/log info \"Supabill API user ${provisioned.apiUsername} provisioned\"`,
    "/log info \"Supabill provision completed\"",
  ].join("\n");

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
      "/provision/:provisionToken",
    ],
  });
});

import { serve } from "@hono/node-server";

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
