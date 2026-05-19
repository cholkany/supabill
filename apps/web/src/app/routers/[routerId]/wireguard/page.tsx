"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getWireguardStatus,
  probeRouterWireguard,
  provisionRouterWireguard,
  type WireguardProbeResult,
  type WireguardStatus,
} from "@/lib/router-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function StatusBadge({ status }: { status: "pending" | "applied" | "error" }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    applied: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    error: "bg-red-500/15 text-red-600 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-foreground/10 bg-foreground/[0.04] px-3 py-1.5 text-xs">
          {value}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`));
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

export default function WireguardPage({ params }: { params: Promise<{ routerId: string }> }) {
  const [routerId, setRouterId] = useState<string | null>(null);
  const [wg, setWg] = useState<WireguardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<WireguardProbeResult | null>(null);
  const [wanHost, setWanHost] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    params.then((p) => setRouterId(p.routerId));
  }, [params]);

  useEffect(() => {
    if (!routerId) return;
    getWireguardStatus(routerId)
      .then(setWg)
      .catch(() => toast.error("Could not load WireGuard status."))
      .finally(() => setLoading(false));
  }, [routerId]);

  async function handleProvision() {
    if (!routerId) return;
    setProvisioning(true);
    try {
      await provisionRouterWireguard(routerId, wanHost.trim() || undefined);
      const updated = await getWireguardStatus(routerId);
      setWg(updated);
      toast.success("WireGuard provisioned on router.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setProvisioning(false);
    }
  }

  async function handleProbe() {
    if (!routerId) return;
    setProbing(true);
    try {
      const result = await probeRouterWireguard(routerId);
      setProbe(result);
      const wgOk = result.wireguard.ok && Boolean(result.wireguard.lastHandshakeAt);
      const rosOk = result.routerOs.ok;
      if (wgOk && rosOk) {
        toast.success("Tunnel is up and RouterOS API is reachable.");
      } else if (wgOk) {
        toast.message("Tunnel looks up, but RouterOS API probe failed.");
      } else {
        toast.message("Tunnel probe did not detect a recent handshake.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Probe failed.");
    } finally {
      setProbing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading WireGuard status…
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* ── Header ── */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Remote access</p>
        <h2 className="text-xl font-semibold tracking-tight">WireGuard tunnel</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Supabill provisions a WireGuard server directly on the MikroTik. Once active the router is
          reachable over an encrypted VPN from anywhere — no port forwarding or physical LAN access
          required.
        </p>
      </div>

      {/* ── Not configured ── */}
      {(!wg || !wg.configured) && (
        <Card className="rounded-2xl border-foreground/10 bg-background/90">
          <CardHeader>
            <CardTitle>Set up WireGuard</CardTitle>
            <CardDescription>
              Generate a WireGuard interface on the router and download the client config to connect.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Router must have a reachable WAN IP</p>
              <p className="mt-1 text-xs opacity-80">
                WireGuard is UDP-based and cannot use HTTP tunnels like ngrok. The MikroTik needs a
                public IP on its WAN port (or DDNS hostname) reachable on UDP port 51820. For ISP
                edge routers this is typically already the case.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wan-host">Router WAN IP / hostname (optional)</Label>
              <Input
                id="wan-host"
                value={wanHost}
                onChange={(e) => setWanHost(e.target.value)}
                placeholder="203.0.113.10  or  router.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the LAN IP already on file — useful if you update this later.
              </p>
            </div>

            <Button disabled={provisioning} onClick={handleProvision} className="w-fit">
              {provisioning ? "Provisioning…" : "Provision WireGuard on router"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Configured ── */}
      {wg?.configured && (
        <>
          {/* Status card */}
          <Card className="rounded-2xl border-foreground/10 bg-background/90">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">Tunnel status</CardTitle>
                <CardDescription>supabill-wg on the MikroTik</CardDescription>
              </div>
              <StatusBadge status={wg.status} />
            </CardHeader>
            <CardContent className="grid gap-3">
              {wg.lastError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
                  {wg.lastError}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" disabled={probing} onClick={handleProbe}>
                  {probing ? "Probing…" : "Probe tunnel + router"}
                </Button>
                {probe && (
                  <p className="text-xs text-muted-foreground">
                    Last probe took {probe.elapsedMs}ms
                  </p>
                )}
              </div>
              {probe && (
                <div className="grid gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 text-xs">
                  <div className="grid gap-1 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Tunnel IP</span>
                      <div className="font-mono">{probe.tunnelIp}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RouterOS API</span>
                      <div className={probe.routerOs.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                        {probe.routerOs.ok ? `Reachable (${probe.routerOs.identity ?? "ok"})` : `Unreachable (${probe.routerOs.error ?? "failed"})`}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">WireGuard handshake</span>
                      <div>
                        {probe.wireguard.ok ? (
                          probe.wireguard.lastHandshakeAt ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              OK on {probe.wireguard.interfaceName} ({new Date(probe.wireguard.lastHandshakeAt).toLocaleString()})
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              Peer seen on {probe.wireguard.interfaceName}, but no handshake yet
                            </span>
                          )
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            {probe.wireguard.reason}
                            {probe.wireguard.message ? ` — ${probe.wireguard.message}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <CopyBlock label="Router tunnel IP" value={wg.routerTunnelIp} />
                <CopyBlock label="Client tunnel IP" value={wg.peerTunnelIp} />
                <CopyBlock label="Endpoint" value={wg.endpoint} />
                <CopyBlock label="Listen port" value={String(wg.listenPort)} />
                <CopyBlock label="Router public key" value={wg.routerPublicKey} />
                <CopyBlock label="Client public key" value={wg.peerPublicKey} />
              </div>
              {wg.appliedAt && (
                <p className="text-xs text-muted-foreground">
                  Applied {new Date(wg.appliedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Client .conf */}
          <Card className="rounded-2xl border-foreground/10 bg-background/90">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">Client config</CardTitle>
                <CardDescription>
                  Import into WireGuard app on any device to connect to this router remotely.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowConfig((v) => !v)}>
                {showConfig ? "Hide" : "Show"} config
              </Button>
            </CardHeader>
            {showConfig && (
              <CardContent className="grid gap-3">
                <pre className="overflow-x-auto rounded-xl border border-foreground/10 bg-foreground/[0.04] p-4 text-xs leading-relaxed">
                  {wg.clientConfig}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(wg.clientConfig)
                        .then(() => toast.success("Config copied"))
                    }
                  >
                    Copy config
                  </Button>
                  <a
                    href={`/api/routers/${routerId}/wireguard/client-config`}
                    download="supabill-wg.conf"
                  >
                    <Button variant="outline" size="sm">
                      Download .conf
                    </Button>
                  </a>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Re-provision */}
          <Card className="rounded-2xl border-foreground/10 bg-background/90">
            <CardHeader>
              <CardTitle className="text-base">Re-provision</CardTitle>
              <CardDescription>
                Regenerates all keys and pushes a fresh WireGuard config to the router. Existing
                client configs will stop working.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wan-host-reprovision">WAN host override (optional)</Label>
                <Input
                  id="wan-host-reprovision"
                  value={wanHost}
                  onChange={(e) => setWanHost(e.target.value)}
                  placeholder={wg.wanHost ?? "leave blank to keep current"}
                />
              </div>
              <Button
                variant="outline"
                disabled={provisioning}
                onClick={handleProvision}
                className="w-fit"
              >
                {provisioning ? "Reprovisioning…" : "Reprovision WireGuard"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
