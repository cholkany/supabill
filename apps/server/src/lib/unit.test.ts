import assert from "node:assert/strict";
import { test } from "node:test";

import { generateBootstrapTemplate } from "./routeros/bootstrap-template.js";
import { generateConfig } from "./routeros/generate-config.js";

// The modules below import @supabill/env at load time; give it valid values.
process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/supabill";
process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.CORS_ORIGIN ??= "http://localhost:3001";

test("generateConfig writes the default DNS, NTP and timezone", () => {
  const script = generateConfig({});
  assert.match(script, /\/ip dns set servers="1\.1\.1\.1,8\.8\.8\.8"/);
  assert.match(script, /\/system ntp client set enabled=yes servers="pool\.ntp\.org"/);
  assert.match(script, /\/system clock set time-zone-name="Africa\/Juba"/);
  assert.doesNotMatch(script, /\/ip hotspot add/);
});

test("generateConfig only adds hotspot commands when ports are selected", () => {
  const script = generateConfig({ hotspotPorts: ["ether2", "ether3"] });
  assert.match(script, /bridge port add bridge=\$bridgeName interface=\$port/);
  assert.match(script, /\/ip hotspot add name=\$hotspotName/);
});

test("generateBootstrapTemplate accepts plain API 8728 and never grants full group", () => {
  const script = generateBootstrapTemplate({
    claimCode: "SB-AAAA-BBBB",
    interfaceName: "supabill-wg",
    routerPrivateKey: "router-private",
    routerTunnelIp: "10.100.0.2/32",
    serverPublicKey: "server-public",
    serverTunnelIp: "10.100.0.1/32",
    serverEndpoint: "203.0.113.1:51820",
    serverBaseUrl: "https://api.example.com/",
    apiUsername: "supa_abc",
    apiPassword: "secret",
  });

  assert.match(script, /dst-port=8728 action=accept/);
  assert.doesNotMatch(script, /dst-port=8729 action=accept/);
  assert.match(script, /group=write/);
  assert.doesNotMatch(script, /group=full/);
  assert.match(script, /https:\/\/api\.example\.com\/router\/register\/SB-AAAA-BBBB/);
});

test("allocateRouterTunnelIp skips the hub address and already used addresses", async () => {
  const { allocateRouterTunnelIp } = await import("./wg-ipam.js");

  const empty = { select: () => ({ from: async () => [] }) };
  assert.equal(await allocateRouterTunnelIp(empty), "10.100.0.2");

  const used = { select: () => ({ from: async () => [{ ip: "10.100.0.2/32" }] }) };
  assert.equal(await allocateRouterTunnelIp(used), "10.100.0.3");
});

test("router credentials encrypt and decrypt symmetrically", async () => {
  const { encryptSecret, decryptSecret } = await import("./router-crypto.js");

  const payload = encryptSecret("router-password");
  assert.notEqual(payload, "router-password");
  assert.equal(decryptSecret(payload), "router-password");
});
