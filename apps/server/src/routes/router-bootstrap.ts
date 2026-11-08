import { Hono } from "hono";
import { db } from "@supabill/db";
import { managedRouter, managedRouterWireguard } from "@supabill/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "../lib/router-crypto.js";
import { provisionWireguard } from "../lib/wireguard.js";
import { getRouterByClaimCode } from "../lib/router/claim-code.js";
import { generateBootstrapTemplate } from "../lib/routeros/bootstrap-template.js";
import { env } from "@supabill/env/server";

export const routerBootstrapRoute = new Hono();

routerBootstrapRoute.get("/:claimCode", async (c) => {
  const claimCode = c.req.param("claimCode");

  const router = await getRouterByClaimCode(claimCode);
  if (!router) {
    c.status(404);
    return c.text("# Router not found for this claim code");
  }

  // Determine server base URL
  const forwardedHost = c.req.header("x-forwarded-host");
  const forwardedProto = c.req.header("x-forwarded-proto") ?? "http";
  const requestOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(c.req.url).origin;
  const serverBaseUrl = env.SERVER_PUBLIC_URL || requestOrigin;

  const hostName = new URL(serverBaseUrl).hostname;

  // Bootstrap can be re-fetched (reloads, retries). Only generate keys once:
  // re-provisioning rotates the router's key and breaks a working tunnel.
  const existingWg = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, router.id),
  });
  if (!existingWg) {
    const provisionResult = await provisionWireguard(router.id, router.userId, hostName);
    if ("error" in provisionResult) {
      c.status(500);
      return c.text(`# Provisioning failed: ${provisionResult.error}`);
    }
  }

  await db
    .update(managedRouter)
    .set({
      status: "bootstrap_generated",
      updatedAt: new Date(),
    })
    .where(eq(managedRouter.id, router.id));

  const wg = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, router.id),
  });

  if (!wg) {
    c.status(500);
    return c.text("# WireGuard record not found after provisioning");
  }

  const normalizedWanHost = wg.wanHost || hostName;
  const serverEndpoint = `${normalizedWanHost}:${wg.routerListenPort}`;

  const script = generateBootstrapTemplate({
    claimCode,
    interfaceName: wg.routerInterfaceName,
    routerPrivateKey: decryptSecret(wg.routerPrivateKeyEncrypted),
    routerTunnelIp: wg.peerTunnelIp,
    serverPublicKey: wg.peerPublicKey,
    serverTunnelIp: wg.routerTunnelIp,
    serverEndpoint,
    serverBaseUrl,
    apiUsername: router.apiUsername,
    apiPassword: decryptSecret(router.apiPasswordEncrypted),
  });

  c.header("Content-Type", "text/plain");
  return c.body(script);
});
