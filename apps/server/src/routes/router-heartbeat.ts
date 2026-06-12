import { Hono } from "hono";
import { updateRouterHeartbeat } from "../lib/router/heartbeat.js";

export const routerHeartbeatRoute = new Hono();

routerHeartbeatRoute.post("/:routerId", async (c) => {
  const routerId = c.req.param("routerId");

  const payload = await c.req.json();

  await updateRouterHeartbeat({
    routerId,
    cpuLoadPercent: payload.cpu,
    memoryUsagePercent: payload.memory,
    routerOsVersion: payload.version,
  });

  return c.json({
    success: true,
  });
});