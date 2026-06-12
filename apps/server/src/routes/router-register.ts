import { Hono } from "hono";
import { db } from "@supabill/db";
import { managedRouter } from "@supabill/db/schema";
import { eq } from "drizzle-orm";
import { getRouterByClaimCode } from "../lib/router/claim-code.js";
import { boss } from "../lib/jobs/queue.js";

export const routerRegisterRoute = new Hono();

routerRegisterRoute.post("/:claimCode", async (c) => {
  const claimCode = c.req.param("claimCode");
  
  let payload: {
    serialNumber?: string;
    routerOsVersion?: string;
    architecture?: string;
    identity?: string;
  } = {};

  try {
    payload = await c.req.json();
  } catch {
    // empty or invalid JSON is handled gracefully
  }

  const router = await getRouterByClaimCode(claimCode);
  if (!router) {
    c.status(404);
    return c.json({ error: "Router not found" });
  }

  // Update router metadata and transition status to connecting
  await db
    .update(managedRouter)
    .set({
      status: "connecting",
      serialNumber: payload.serialNumber || null,
      routerOsVersion: payload.routerOsVersion || null,
      architecture: payload.architecture || null,
      routerIdentity: payload.identity || null,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(managedRouter.id, router.id));

  // Trigger background provisioning job
  await boss.send("router-provision", { routerId: router.id });

  return c.json({
    success: true,
    message: "Registration successful. Router is now connecting.",
  });
});
