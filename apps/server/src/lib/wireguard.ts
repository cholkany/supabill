import { generateKeyPairSync } from "node:crypto";
import { promises as fs } from "node:fs";
import { exec } from "node:child_process";
import { and, eq } from "drizzle-orm";

import { db } from "@supabill/db";
import { managedRouter, managedRouterWireguard } from "@supabill/db/schema";
import { env } from "@supabill/env/server";

import { decryptSecret, encryptSecret } from "./router-crypto.js";
import { probeRouter } from "./routeros-probe.js";
import { getWireguardServerConfig } from "./wireguard-server.js";
import { allocateRouterTunnelIp } from "./wg-ipam.js";

const SUPABILL_WG_IFACE = "supabill-wg";
const LEGACY_WG_IFACE = "supabill";

function normalizePublicHost(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept either "host", "host:port", or a full URL like "https://host:port/path".
  try {
    if (trimmed.includes("://")) {
      const url = new URL(trimmed);
      return url.hostname;
    }
  } catch {
    // ignore; fall through to manual normalization
  }

  // Strip any path/query fragments
  const noPath = trimmed.split("/")[0] ?? trimmed;
  // If it looks like host:port (common for IPv4), drop the port.
  if ((noPath.match(/:/g) ?? []).length === 1 && noPath.includes(".")) {
    return noPath.split(":")[0] ?? noPath;
  }
  return noPath;
}

function splitEndpointHostPort(endpoint: string): { host: string; port: string } {
  // Accept "host:port" or "https://host:port/path" (we only need host+port).
  const trimmed = endpoint.trim();
  if (trimmed.includes("://")) {
    const url = new URL(trimmed);
    return { host: url.hostname, port: url.port || "51820" };
  }

  const noPath = trimmed.split("/")[0] ?? trimmed;
  const parts = noPath.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { host: parts[0], port: parts[1] };
  }
  return { host: noPath, port: "51820" };
}

// ── Key generation ──────────────────────────────────────────────────────────

function generateWireguardKeypair(): { privateKey: string; publicKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync("x25519");

  const privDer = privObj.export({ type: "pkcs8", format: "der" });
  const privRaw = privDer.slice(-32);

  const pubDer = pubObj.export({ type: "spki", format: "der" });
  const pubRaw = pubDer.slice(-32);

  return {
    privateKey: privRaw.toString("base64"),
    publicKey: pubRaw.toString("base64"),
  };
}

// ── RouterOS script generation ──────────────────────────────────────────────
// Architecture: Supabill = WG server (listens). MikroTik = WG client (dials out).

type WireguardScriptOptions = {
  interfaceName: string;
  routerPrivateKey: string;  // MikroTik keeps its own private key
  routerTunnelIp: string;    // MikroTik's address in the tunnel (e.g. 10.100.1.2/30)
  serverPublicKey: string;   // Supabill's public key — MikroTik needs this for its peer config
  serverTunnelIp: string;    // Supabill's tunnel IP — MikroTik allows traffic from this
  serverEndpoint: string;    // Supabill's public IP:port — MikroTik dials this
};

export function generateWireguardScript(options: WireguardScriptOptions): string {
  const iface = options.interfaceName;
  const serverAllowedIp = options.serverTunnelIp.split("/")[0] + "/32";
  const { host: endpointHost, port: endpointPort } = splitEndpointHostPort(options.serverEndpoint);

  return [
    // MikroTik creates its WG interface (no listen-port — it's the client)
    `/interface/wireguard/add name=${iface} private-key="${options.routerPrivateKey}"`,
    // Assign MikroTik's tunnel IP
    `/ip/address/add address=${options.routerTunnelIp} interface=${iface}`,
    // Add Supabill as the peer — with endpoint so MikroTik initiates the connection
    `/interface/wireguard/peers/add interface=${iface} public-key="${options.serverPublicKey}" allowed-address=${serverAllowedIp} endpoint-address="${endpointHost}" endpoint-port=${endpointPort} persistent-keepalive=25s`,
    // Allow Supabill to reach the RouterOS API over the tunnel
    `/ip/firewall/filter/add chain=input action=accept protocol=tcp dst-port=8728 src-address=${serverAllowedIp} comment="supabill-api"`,
  ].join("\n");
}

// ── Server-side peer config file ─────────────────────────────────────────────
// Writes/regenerates the WireGuard server config that the Docker wireguard
// container reads from WG_CONFS_DIR. Each router is a [Peer] section.

async function syncServerWireguardConf(): Promise<void> {
  const confsDir = env.WG_CONFS_DIR;
  if (!confsDir) return; // Not configured — skip (dev without Docker)

  // Fetch all WG records to rebuild the full conf
  const allWg = await db.select().from(managedRouterWireguard);

  const serverConfig = getWireguardServerConfig();
  const serverPrivateKey = serverConfig.privateKey;

  const ifaceSection = [
    "[Interface]",
    `PrivateKey = ${serverPrivateKey}`,
    `Address = 10.100.0.1/16`,
    `ListenPort = ${serverConfig.listenPort}`,
  ].join("\n");

  const peerSections = allWg.map((wg) => {
    const routerTunnelAddr = wg.peerTunnelIp.split("/")[0] + "/32";
    return [
      "[Peer]",
      `# Router ${wg.routerId}`,
      `PublicKey = ${wg.routerPublicKey}`,
      `AllowedIPs = ${routerTunnelAddr}`,
    ].join("\n");
  });

  const conf = [ifaceSection, ...peerSections].join("\n\n");
  const confPath = `${confsDir}/${SUPABILL_WG_IFACE}.conf`;
  const legacyConfPath = `${confsDir}/${LEGACY_WG_IFACE}.conf`;

  await fs.mkdir(confsDir, { recursive: true });
  await fs.writeFile(confPath, conf, "utf8");
  // Backward-compatible: older deployments used the `supabill.conf` name.
  // Keep both in sync so existing containers keep working during migration.
  await fs.writeFile(legacyConfPath, conf, "utf8");

  // Two-phase apply:
  //   • wg syncconf — atomically updates peers on an existing interface (no disconnects)
  //   • wg-quick up  — creates the interface for the first time
  // bash is required for <() process substitution (installed in server Dockerfile).
  const applyCmd = [
    `if wg show ${SUPABILL_WG_IFACE} > /dev/null 2>&1;`,
    `  then wg syncconf ${SUPABILL_WG_IFACE} <(wg-quick strip ${confPath});`,
    `  elif wg show ${LEGACY_WG_IFACE} > /dev/null 2>&1;`,
    `  then wg syncconf ${LEGACY_WG_IFACE} <(wg-quick strip ${legacyConfPath});`,
    `  else wg-quick up ${confPath};`,
    `fi`,
  ].join(" ");

  exec(`bash -c '${applyCmd}'`, (err) => {
    if (err) {
      console.warn("[WireGuard] apply failed (normal outside Docker):", err.message);
    } else {
      console.log("[WireGuard] Peer config applied.");
    }
  });
}

export async function ensureWireguardInterfaceUpFromDisk(): Promise<void> {
  const confsDir = env.WG_CONFS_DIR;
  if (!confsDir) return;

  const confPath = `${confsDir}/${SUPABILL_WG_IFACE}.conf`;
  const legacyConfPath = `${confsDir}/${LEGACY_WG_IFACE}.conf`;

  const exists = async (path: string) => {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  };

  const preferredConf = (await exists(confPath)) ? confPath : (await exists(legacyConfPath)) ? legacyConfPath : null;
  if (!preferredConf) return;

  const iface = preferredConf === confPath ? SUPABILL_WG_IFACE : LEGACY_WG_IFACE;
  const cmd = `if wg show ${iface} > /dev/null 2>&1; then exit 0; else wg-quick up ${preferredConf}; fi`;

  await new Promise<void>((resolve) => {
    exec(`bash -c '${cmd}'`, (err) => {
      if (err) {
        console.warn("[WireGuard] ensure-up failed (may be normal on hosts without NET_ADMIN):", err.message);
      } else {
        console.log(`[WireGuard] Interface ${iface} ensured up from ${preferredConf}.`);
      }
      resolve();
    });
  });
}

type WgHandshakeInfo =
  | { ok: false; reason: "no-interface" | "no-peer" | "exec-failed"; message?: string }
  | { ok: true; interfaceName: string; peerPublicKey: string; lastHandshakeAt: string | null };

async function getPeerHandshakeInfo(input: {
  peerPublicKey: string;
}): Promise<WgHandshakeInfo> {
  const peerKey = input.peerPublicKey.trim();

  const run = (cmd: string) =>
    new Promise<{ ok: true; stdout: string; stderr: string } | { ok: false; message: string }>((resolve) => {
      exec(cmd, { timeout: 4000 }, (err, stdout, stderr) => {
        if (err) return resolve({ ok: false, message: err.message });
        resolve({ ok: true, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
      });
    });

  const tryIface = async (iface: string): Promise<WgHandshakeInfo> => {
    const out = await run(`wg show ${iface} latest-handshakes`);
    if (!out.ok) {
      // If the interface does not exist, wg returns non-zero. Treat as "no-interface".
      if (out.message.toLowerCase().includes("no such device") || out.message.toLowerCase().includes("cannot find device")) {
        return { ok: false, reason: "no-interface", message: out.message };
      }
      return { ok: false, reason: "exec-failed", message: out.message };
    }

    const lines = (out.stdout || "").trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const match = lines.find((line) => line.startsWith(peerKey + " "));
    if (!match) {
      return { ok: false, reason: "no-peer" };
    }

    const parts = match.split(/\s+/);
    const ts = Number(parts[1] ?? "0");
    const lastHandshakeAt = ts > 0 ? new Date(ts * 1000).toISOString() : null;
    return { ok: true, interfaceName: iface, peerPublicKey: peerKey, lastHandshakeAt };
  };

  // Prefer the new iface; fallback to legacy.
  const preferred = await tryIface(SUPABILL_WG_IFACE);
  if (preferred.ok) return preferred;
  const legacy = await tryIface(LEGACY_WG_IFACE);
  if (legacy.ok) return legacy;

  // Return the most informative error.
  if (preferred.reason === "exec-failed") return preferred;
  if (legacy.reason === "exec-failed") return legacy;
  if (preferred.reason === "no-interface" && legacy.reason === "no-interface") return preferred;
  return preferred.reason === "no-peer" || legacy.reason === "no-peer"
    ? { ok: false, reason: "no-peer" }
    : { ok: false, reason: "exec-failed" };
}

export async function probeWireguardAndRouter(routerId: string, userId: string) {
  const router = await db.query.managedRouter.findFirst({
    where: and(eq(managedRouter.id, routerId), eq(managedRouter.userId, userId)),
  });
  if (!router) return null;

  const wg = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, routerId),
  });
  if (!wg) {
    return { configured: false as const };
  }

  const mikrotikTunnelIp = wg.peerTunnelIp.split("/")[0] ?? "";
  const handshake = await getPeerHandshakeInfo({ peerPublicKey: wg.routerPublicKey });

  const startedAt = Date.now();
  let routerOs: { ok: boolean; identity?: string; error?: string } = { ok: false };
  try {
    const probe = await probeRouter({
      host: mikrotikTunnelIp,
      port: router.apiPort,
      username: router.apiUsername,
      password: decryptSecret(router.apiPasswordEncrypted),
    });
    routerOs = { ok: true, identity: probe.identity };
  } catch (error) {
    routerOs = { ok: false, error: error instanceof Error ? error.message : "RouterOS probe failed" };
  }

  const elapsedMs = Date.now() - startedAt;

  return {
    configured: true as const,
    tunnelIp: mikrotikTunnelIp,
    wireguard: handshake,
    routerOs,
    elapsedMs,
  };
}

export async function provisionWireguard(routerId: string, userId: string, serverHostname?: string) {
  const router = await db.query.managedRouter.findFirst({
    where: and(eq(managedRouter.id, routerId), eq(managedRouter.userId, userId)),
  });
  if (!router) return { error: "Router not found." };

  // routerKeys  = MikroTik's keypair  (private stays on MikroTik via script)
  // serverKeys  = Supabill's keypair  (private stays in DB / env, public goes to MikroTik)
  const routerKeys = generateWireguardKeypair();
  const serverKeys = getWireguardServerConfig();
  const routerIp = await allocateRouterTunnelIp();
  const serverIp = "10.100.0.1/32";

  const wgId = crypto.randomUUID();
  const existing = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, routerId),
  });

  const record = {
    routerInterfaceName: SUPABILL_WG_IFACE,
    routerListenPort: serverKeys.listenPort,
    routerPrivateKeyEncrypted: encryptSecret(routerKeys.privateKey),
    routerPublicKey: routerKeys.publicKey,
    routerTunnelIp: serverIp,   // Supabill's tunnel IP  e.g. 10.100.0.1/32
    peerPrivateKeyEncrypted: encryptSecret(serverKeys.privateKey),
    peerPublicKey: serverKeys.publicKey,
    peerTunnelIp: routerIp + "/32",     // MikroTik's tunnel IP  e.g. 10.100.0.2/32
    wanHost: serverHostname || normalizePublicHost(env.WG_PUBLIC_HOST) || null,
    status: "pending" as const,
    lastError: null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(managedRouterWireguard).set(record).where(eq(managedRouterWireguard.routerId, routerId));
  } else {
    await db.insert(managedRouterWireguard).values({ id: wgId, routerId, ...record });
  }

  await db
    .update(managedRouterWireguard)
    .set({ status: "applied", appliedAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(managedRouterWireguard.routerId, routerId));

  // Write/refresh the server-side WireGuard peer config
  await syncServerWireguardConf();

  return { success: true };
}
// ── Script generator (called from provision endpoint) ───────────────────────

export async function getWireguardScriptForRouter(routerId: string): Promise<string | null> {
  const wg = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, routerId),
  });
  if (!wg) return null;

  const normalizedWanHost = normalizePublicHost(wg.wanHost);
  const serverEndpoint = normalizedWanHost ? `${normalizedWanHost}:${wg.routerListenPort}` : null;

  if (!serverEndpoint) {
    console.warn(`[WireGuard] WG_PUBLIC_HOST not set — omitting endpoint from MikroTik script for router ${routerId}`);
  }

  return generateWireguardScript({
    interfaceName: wg.routerInterfaceName,
    routerPrivateKey: decryptSecret(wg.routerPrivateKeyEncrypted), // MikroTik's private key
    routerTunnelIp: wg.peerTunnelIp,      // MikroTik's address in tunnel (10.100.x.2/30)
    serverPublicKey: wg.peerPublicKey,     // Supabill's public key
    serverTunnelIp: wg.routerTunnelIp,    // Supabill's tunnel IP (10.100.x.1/30)
    serverEndpoint: serverEndpoint ?? `127.0.0.1:${wg.routerListenPort}`,
  });
}

// ── Status / client config (unchanged UI contract) ───────────────────────────

export async function getWireguardStatus(routerId: string, userId: string) {
  const router = await db.query.managedRouter.findFirst({
    where: and(eq(managedRouter.id, routerId), eq(managedRouter.userId, userId)),
  });
  if (!router) return null;

  const wg = await db.query.managedRouterWireguard.findFirst({
    where: eq(managedRouterWireguard.routerId, routerId),
  });
  if (!wg) return { configured: false };

  // The MikroTik's tunnel IP is peerTunnelIp — this is how the server reaches it
  const mikrotikTunnelIp = wg.peerTunnelIp.split("/")[0];
  const endpoint = `${wg.wanHost ?? "not-set"}:${wg.routerListenPort}`;

  return {
    configured: true,
    status: wg.status,
    lastError: wg.lastError,
    appliedAt: wg.appliedAt?.toISOString() ?? null,
    routerPublicKey: wg.routerPublicKey,
    routerTunnelIp: mikrotikTunnelIp,      // MikroTik's tunnel IP (what server uses to connect)
    peerPublicKey: wg.peerPublicKey,
    peerTunnelIp: wg.routerTunnelIp,       // Supabill's tunnel IP
    endpoint,
    listenPort: wg.routerListenPort,
    wanHost: wg.wanHost,
  };
}
