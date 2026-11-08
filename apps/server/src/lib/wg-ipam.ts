import { db } from "@supabill/db";
import { managedRouterWireguard } from "@supabill/db/schema";

// Accepts the db or a transaction so the caller can hold an advisory lock
// around the read-then-insert and avoid handing out the same IP twice.
export async function allocateRouterTunnelIp(executor: { select: any } = db): Promise<string> {
  const existing = await executor
    .select({
      ip: managedRouterWireguard.peerTunnelIp,
    })
    .from(managedRouterWireguard);

  const used = new Set<string>(existing.map((r: { ip: string }) => r.ip.split("/")[0]!));

  // 10.100.0.1 is reserved for the WireGuard server/hub.
  // Start from i = 2 to allocate from 10.100.0.2 onwards.
  for (let i = 2; i < 65024; i++) {
    const thirdOctet = Math.floor((i - 1) / 254);
    const fourthOctet = ((i - 1) % 254) + 1;
    const ip = `10.100.${thirdOctet}.${fourthOctet}`;

    if (!used.has(ip)) {
      return ip;
    }
  }

  throw new Error("Tunnel pool exhausted");
}
