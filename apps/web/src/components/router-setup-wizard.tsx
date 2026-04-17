"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  completeRouterSetup,
  getRouterSetupState,
  startRouterSetupStep1,
  testRouterSetupAccessibility,
  type RouterSetupState,
} from "@/lib/router-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WizardStep = 1 | 2 | 3 | 4;

export default function RouterSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [routerName, setRouterName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupState, setSetupState] = useState<RouterSetupState | null>(null);
  const [routerHost, setRouterHost] = useState("");
  const [selectedPorts, setSelectedPorts] = useState<string[]>([]);
  const [completedRouterId, setCompletedRouterId] = useState<string | null>(null);

  const canSubmitStep1 = routerName.trim().length >= 2 && location.trim().length >= 2;

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
      toast.success("Provision script generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start setup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2Test() {
    if (!setupState) {
      return;
    }

    setLoading(true);
    try {
      await testRouterSetupAccessibility(setupState.setupId, routerHost.trim() || undefined);
      const refreshed = await getRouterSetupState(setupState.setupId);
      setSetupState(refreshed);
      setSelectedPorts(refreshed.hotspotCandidatePorts.slice(0, 2));
      setStep(3);
      toast.success("Router is reachable.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Router test failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3Complete() {
    if (!setupState) {
      return;
    }

    setLoading(true);
    try {
      const completed = await completeRouterSetup({
        setupId: setupState.setupId,
        selectedHotspotPorts: selectedPorts,
      });
      setCompletedRouterId(completed.routerId);
      const refreshed = await getRouterSetupState(setupState.setupId);
      setSetupState(refreshed);
      setStep(4);
      toast.success("Router setup completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete setup.");
    } finally {
      setLoading(false);
    }
  }

  function togglePort(port: string) {
    setSelectedPorts((current) =>
      current.includes(port) ? current.filter((item) => item !== port) : [...current, port],
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <Card className="rounded-3xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardDescription>Router onboarding</CardDescription>
          <CardTitle className="text-2xl md:text-3xl">Add Router</CardTitle>
          <p className="text-sm text-muted-foreground">
            Step {step} of 4: name and location, provisioning, port assignment, and confirmation.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="router-name">Router name</Label>
                <Input
                  id="router-name"
                  value={routerName}
                  onChange={(event) => setRouterName(event.target.value)}
                  placeholder="Core Router - Juba"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="router-location">Location</Label>
                <Input
                  id="router-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Juba HQ"
                />
              </div>

              <div className="pt-2">
                <Button disabled={loading || !canSubmitStep1} onClick={handleStep1}>
                  {loading ? "Creating setup..." : "Continue to provisioning"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 && setupState ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Run this script on the physical router. It points to your live Supabill provision endpoint.
              </p>
              <pre className="overflow-x-auto rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-xs">
                {setupState.provisionScript}
              </pre>

              <div className="flex flex-wrap gap-3">
                <div className="min-w-[260px] flex-1">
                  <Label htmlFor="router-host">Router host (optional override)</Label>
                  <Input
                    id="router-host"
                    value={routerHost}
                    onChange={(event) => setRouterHost(event.target.value)}
                    placeholder="192.168.88.1 or router.example.com"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(setupState.provisionScript).then(() => {
                      toast.success("Provision script copied.");
                    });
                  }}
                >
                  Copy script
                </Button>
                <a href={setupState.provisionUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline">Open provision URL</Button>
                </a>
                <Button disabled={loading} onClick={handleStep2Test}>
                  {loading ? "Testing..." : "Test router accessibility"}
                </Button>
              </div>

              {setupState.setupLogs.length > 0 ? (
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Setup log</p>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {setupState.setupLogs.slice(0, 6).map((logEntry) => (
                      <p key={logEntry}>{logEntry}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 && setupState ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Device ports were extracted. WAN is fixed to <code>ether1</code>. Select the bridge ports
                for hotspot traffic.
              </p>

              <div className="grid gap-2 md:grid-cols-3">
                {setupState.hotspotCandidatePorts.map((port) => {
                  const active = selectedPorts.includes(port);
                  return (
                    <button
                      key={port}
                      type="button"
                      onClick={() => togglePort(port)}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-foreground/10 bg-background"
                      }`}
                    >
                      {port}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={loading || selectedPorts.length === 0} onClick={handleStep3Complete}>
                  {loading ? "Completing setup..." : "Complete setup and run background scripts"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Selected ports: {selectedPorts.length > 0 ? selectedPorts.join(", ") : "None"}
                </p>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm">
                  Router setup is complete. Supabill has started automatic configuration in the background.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => router.push("/routers" as Route)}>Back to routers</Button>
                {completedRouterId ? (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/routers/${completedRouterId}` as Route)}
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
