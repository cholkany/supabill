// Centralized WireGuard server identity.
// Only ONE server keypair exists for the entire deployment.

import { env } from "@supabill/env/server";

export function getWireguardServerConfig() {
  const privateKey = env.WG_SERVER_PRIVATE_KEY;
  const publicKey = env.WG_SERVER_PUBLIC_KEY;

  if (!privateKey || !publicKey) {
    throw new Error("WireGuard server keys not configured");
  }

  return {
    privateKey,
    publicKey,
    listenPort: env.WG_LISTEN_PORT ?? 51820,
  };
}