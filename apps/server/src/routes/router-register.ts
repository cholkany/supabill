import { Hono } from "hono";
import { z } from "zod";
import { db } from "@supabill/db";
import { managedRouter } from "@supabill/db/schema";
import { eq } from "drizzle-orm";
import { getRouterByClaimCode } from "../lib/router/claim-code.js";
import { boss } from "../lib/jobs/queue.js";

const registerPayloadSchema = z.object({
  serialNumber: z.string().max(120).optional(),
  routerOsVersion: z.string().max(60).optional(),
  architecture: z.string().max(60).optional(),
  identity: z.string().max(120).optional(),
});

export const routerRegisterRoute = new Hono();

routerRegisterRoute.post("/:claimCode", async (c) => {
  const claimCode = c.req.param("claimCode");

  let raw: unknown = {};
  try {
    raw = await c.req.json();
  } catch {
    // empty or invalid JSON is handled gracefully
  }

  const parsed = registerPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid registration payload" }, 400);
  }
  const payload = parsed.data;

  const router = await getRouterByClaimCode(claimCode);
  if (!router) {
    return c.json({ error: "Router not found" }, 404);
  }

  // The claim code is a one-time onboarding credential; clear it once the
  // router has registered so the bootstrap URL cannot be replayed.
  await db
    .update(managedRouter)
    .set({
      status: "connecting",
      claimCode: null,
      serialNumber: payload.serialNumber || null,
      routerOsVersion: payload.routerOsVersion || null,
      architecture: payload.architecture || null,
      routerIdentity: payload.identity || null,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(managedRouter.id, router.id));

  await boss.send("router-provision", { routerId: router.id });

  return c.json({
    success: true,
    message: "Registration successful. Router is now connecting.",
  });
});
