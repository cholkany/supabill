"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Copy, Loader2, RefreshCw, Terminal, Wifi } from "lucide-react";

import {
  getRouterSetupState,
  startRouterSetupStep1,
  type RouterSetupState,
} from "@/lib/router-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

// Status values that indicate the router has connected back to the server.
const CONNECTING_STATUSES = new Set(["connecting", "syncing", "connected", "ready"]);
const READY_STATUSES = new Set(["ready"]);
const ERROR_STATUSES = new Set(["error"]);

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    bootstrap_generated: { label: "Script Generated", variant: "secondary" },
    connecting: { label: "Connecting…", variant: "default" },
    connected: { label: "Connected", variant: "default" },
    syncing: { label: "Syncing…", variant: "default" },
    ready: { label: "Ready", variant: "default" },
    error: { label: "Error", variant: "destructive" },
  };

  const entry = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function LifecycleStep({
  icon,
  label,
  done,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
        done
          ? "border-primary/30 bg-primary/5 text-primary"
          : active
            ? "border-foreground/20 bg-foreground/[0.03] text-foreground"
            : "border-foreground/10 text-muted-foreground"
      }`}
    >
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-primary" />
      ) : active ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <Circle className="size-4 shrink-0 opacity-40" />
      )}
      <span className={active && !done ? "animate-pulse" : ""}>{label}</span>
    </div>
  );
}

// ── Wizard ─────────────────────────────────────────────────────────────────

export default function RouterSetupWizard() {
  const router = useRouter();

  // Form state
  const [step, setStep] = useState<WizardStep>(1);
  const [routerName, setRouterName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // Setup / provisioning state
  const [setupState, setSetupState] = useState<RouterSetupState | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSubmitStep1 = routerName.trim().length >= 2 && location.trim().length >= 2;

  // ── Polling ──────────────────────────────────────────────────────────────

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) clearInterval(pollRef.current);
    };
  }, []);

  async function pollStatus(setupId: string) {
    try {
      const refreshed = await getRouterSetupState(setupId);
      setSetupState(refreshed);

      const status = refreshed.routerStatus ?? "";

      if (READY_STATUSES.has(status)) {
        stopPolling();
        setStep(3);
        toast.success("Router is ready!");
        return;
      }

      if (ERROR_STATUSES.has(status)) {
        stopPolling();
        toast.error("Router provisioning encountered an error. Check setup logs.");
        return;
      }
    } catch {
      // silently ignore transient polling errors
    }
  }

  function startPolling(setupId: string) {
    if (pollRef.current !== null) return; // already polling
    setPolling(true);

    // poll immediately then every 5 s
    void pollStatus(setupId);
    pollRef.current = setInterval(() => void pollStatus(setupId), 5000);
  }

  // ── Step handlers ────────────────────────────────────────────────────────

  async function handleStep1() {
    if (!canSubmitStep1) {
      toast.error("Please fill router name and location.");
      return;
    }

    setLoading(true);
    try {
      const response = await startRouterSetupStep1({
        routerName: routerName.trim(),
        location: location.trim(),
      });

      const state = await getRouterSetupState(response.setupId);
      setSetupState(state);
      setStep(2);
      toast.success("Bootstrap script generated.");
      startPolling(response.setupId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start setup.");
    } finally {
      setLoading(false);
    }
  }

  function handleManualRefresh() {
    if (!setupState) return;
    void pollStatus(setupState.setupId);
  }

  function copyScript() {
    if (!setupState?.provisionScript) return;
    navigator.clipboard.writeText(setupState.provisionScript).then(() => {
      toast.success("Bootstrap script copied.");
    });
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const routerStatus = setupState?.routerStatus ?? null;
  const hasConnected = routerStatus ? CONNECTING_STATUSES.has(routerStatus) : false;
  const isReady = routerStatus ? READY_STATUSES.has(routerStatus) : false;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <Card className="rounded-3xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardDescription>Router onboarding</CardDescription>
          <CardTitle className="text-2xl md:text-3xl">Add Router</CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 1 && "Step 1 of 3 — Name and location"}
            {step === 2 && "Step 2 of 3 — Run bootstrap script on router"}
            {step === 3 && "Step 3 of 3 — Router ready"}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── Step 1: Name + Location ── */}
          {step === 1 ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="router-name">Router name</Label>
                <Input
                  id="router-name"
                  value={routerName}
                  onChange={(e) => setRouterName(e.target.value)}
                  placeholder="Core Router – Juba"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="router-location">Location</Label>
                <Input
                  id="router-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Juba HQ"
                />
              </div>
              <div className="pt-2">
                <Button disabled={loading || !canSubmitStep1} onClick={handleStep1}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Generating bootstrap script…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {/* ── Step 2: Bootstrap script + claim code + status ── */}
          {step === 2 && setupState ? (
            <div className="grid gap-6">
              {/* Claim code */}
              {setupState.claimCode ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.18em] text-primary/70">
                    Claim code
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xl font-semibold tracking-widest text-primary">
                      {setupState.claimCode}
                    </span>
                    <button
                      type="button"
                      className="ml-auto rounded-lg p-1.5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                      title="Copy claim code"
                      onClick={() => {
                        navigator.clipboard.writeText(setupState.claimCode ?? "").then(() => {
                          toast.success("Claim code copied.");
                        });
                      }}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This code links your physical router to this setup. It is embedded in the
                    bootstrap script below.
                  </p>
                </div>
              ) : null}

              {/* Bootstrap script */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Terminal className="size-4" />
                    Bootstrap script
                  </p>
                  <Button size="sm" variant="outline" onClick={copyScript}>
                    <Copy className="mr-2 size-3.5" />
                    Copy
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-xs leading-relaxed">
                  {setupState.provisionScript}
                </pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  Paste and run this one-liner in a MikroTik terminal (SSH or Winbox). The router
                  will download and execute the full configuration automatically.
                </p>
              </div>

              {/* Lifecycle progress */}
              <div>
                <p className="mb-3 text-sm font-medium">Provisioning status</p>
                <div className="grid gap-2">
                  <LifecycleStep
                    icon={null}
                    label="Bootstrap script generated"
                    done={true}
                    active={false}
                  />
                  <LifecycleStep
                    icon={null}
                    label="Router fetched script"
                    done={["connecting", "syncing", "connected", "ready"].includes(routerStatus ?? "")}
                    active={routerStatus === "bootstrap_generated" || routerStatus === "pending"}
                  />
                  <LifecycleStep
                    icon={null}
                    label="Router connected to VPN"
                    done={["syncing", "connected", "ready"].includes(routerStatus ?? "")}
                    active={routerStatus === "connecting"}
                  />
                  <LifecycleStep
                    icon={null}
                    label="Configuration applied"
                    done={isReady}
                    active={routerStatus === "syncing"}
                  />
                </div>
              </div>

              {/* Current status + manual refresh */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {polling ? (
                    <Wifi className="size-4 animate-pulse text-primary" />
                  ) : (
                    <Wifi className="size-4 opacity-40" />
                  )}
                  {polling ? "Listening for router…" : "Auto-polling paused"}
                </div>
                <StatusBadge status={routerStatus} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualRefresh}
                  className="ml-auto"
                >
                  <RefreshCw className="mr-2 size-3.5" />
                  Refresh status
                </Button>
              </div>

              {/* Setup logs */}
              {setupState.setupLogs.length > 0 ? (
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Setup log
                  </p>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {setupState.setupLogs.slice(0, 8).map((entry) => (
                      <p key={entry}>{entry}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Skip to dashboard once connected */}
              {hasConnected ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-3 text-sm">
                    ✅ Router has connected back to Supabill. You can proceed to the dashboard while
                    background provisioning finishes.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setStep(3)}>Continue to confirmation</Button>
                    {setupState.completedRouterId ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          router.push(`/routers/${setupState.completedRouterId}` as Route)
                        }
                      >
                        Open router dashboard
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Step 3: Confirmation ── */}
          {step === 3 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium">🎉 Router onboarded successfully</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <strong>{routerName}</strong> at <strong>{location}</strong> is now managed by
                  Supabill. Background jobs will keep the configuration in sync.
                </p>
              </div>

              {setupState ? (
                <div className="grid gap-2">
                  <LifecycleStep label="Bootstrap script generated" done={true} active={false} icon={null} />
                  <LifecycleStep label="Router connected" done={true} active={false} icon={null} />
                  <LifecycleStep
                    label="Configuration applied"
                    done={isReady}
                    active={!isReady}
                    icon={null}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => router.push("/routers" as Route)}>Back to routers</Button>
                {setupState?.completedRouterId ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/routers/${setupState.completedRouterId}` as Route)
                    }
                  >
                    Open router dashboard
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
