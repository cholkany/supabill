"use client";

import { authClient } from "@/lib/auth-client";
import { formatCurrency, formatDate, formatSpeed } from "@/lib/format";
import type { PlatformSnapshot } from "@/lib/platform-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusTone(status: string) {
  switch (status) {
    case "online":
    case "active":
    case "paid":
    case "connected":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "warning":
    case "grace":
    case "open":
    case "trial":
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    default:
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  }
}

export default function Dashboard({
  session,
  snapshot,
}: {
  session: typeof authClient.$Infer.Session;
  snapshot: PlatformSnapshot;
}) {
  const primaryTenant = snapshot.tenants[0];

  if (!primaryTenant) {
    return <div className="p-8">No tenants found.</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <section className="grid gap-4 rounded-3xl border border-foreground/10 bg-background/80 p-6 shadow-[0_30px_120px_-50px_rgba(21,127,107,0.7)] backdrop-blur md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {snapshot.mode === "database" ? "Live data" : "Demo mode"}
            </span>
            <span className="rounded-full bg-foreground/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Multitenant MikroTik billing
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Welcome back</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              {session.user.name}, {primaryTenant.name} is ready to bill, sync, and support your network.
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Supabill structures routers, plans, customers, invoices, collections, and remote access the
            way a Mikhmon-inspired ISP team actually works, while leaving room for future custom modules.
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Primary tenant</p>
            <h2 className="text-2xl font-semibold">{primaryTenant.name}</h2>
            <p className="text-sm text-muted-foreground">
              {primaryTenant.slug} - {primaryTenant.currency} billing
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(primaryTenant.metrics.mrr, primaryTenant.currency)}
              </p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">WireGuard peers</p>
              <p className="mt-1 text-2xl font-semibold">
                {primaryTenant.metrics.wireguardConnected}/{primaryTenant.metrics.wireguardTotal}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Snapshot generated {formatDate(snapshot.generatedAt)}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Customers",
            value: primaryTenant.metrics.customers.toString(),
            detail: `${primaryTenant.metrics.activeSubscriptions} active subscriptions`,
          },
          {
            label: "Overdue balance",
            value: formatCurrency(primaryTenant.metrics.overdue, primaryTenant.currency),
            detail: "Collections queue",
          },
          {
            label: "Routers online",
            value: `${primaryTenant.metrics.routersOnline}/${primaryTenant.metrics.routersTotal}`,
            detail: "MikroTik nodes monitored",
          },
          {
            label: "Custom features",
            value: primaryTenant.features.length.toString(),
            detail: "Business modules registered",
          },
        ].map((item) => (
          <Card key={item.label} className="rounded-3xl border-foreground/10 bg-background/80">
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.detail}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-foreground/10 bg-background/80">
          <CardHeader>
            <CardDescription>Tenant portfolio</CardDescription>
            <CardTitle>Operations across all businesses</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {snapshot.tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="grid gap-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 md:grid-cols-[1fr_auto]"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{tenant.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tenant.metrics.customers} customers - {tenant.metrics.routersOnline}/
                    {tenant.metrics.routersTotal} routers online - {tenant.metrics.wireguardConnected}/
                    {tenant.metrics.wireguardTotal} WireGuard peers connected
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs text-muted-foreground">MRR</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(tenant.metrics.mrr, tenant.currency)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/80">
          <CardHeader>
            <CardDescription>Future-ready extensions</CardDescription>
            <CardTitle>Custom business features</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {primaryTenant.features.map((feature) => (
              <div key={feature.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{feature.name}</h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {feature.featureKey}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(feature.status)}`}>
                    {feature.status}
                  </span>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-foreground/[0.03] p-3 text-[11px] text-muted-foreground">
                  {JSON.stringify(feature.config, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl border-foreground/10 bg-background/80">
          <CardHeader>
            <CardDescription>MikroTik estate</CardDescription>
            <CardTitle>Routers and remote access</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {primaryTenant.routers.map((router) => (
              <div key={router.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{router.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {router.siteName} - {router.host} - RouterOS {router.routerOsVersion ?? "Unknown"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(router.status)}`}>
                    {router.status}
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  API user {router.username} - last seen {formatDate(router.lastSeenAt)}
                </p>
              </div>
            ))}

            {primaryTenant.wireguardPeers.map((peer) => (
              <div
                key={peer.id}
                className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{peer.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {peer.routerName} - {peer.endpoint}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(peer.status)}`}>
                    {peer.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Allowed IPs {peer.allowedIps} - Last handshake {formatDate(peer.lastHandshakeAt)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`http://localhost:3000/api/platform/wireguard/${peer.routerId}/${peer.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm">Open config JSON</Button>
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/80">
          <CardHeader>
            <CardDescription>Billing operations</CardDescription>
            <CardTitle>Customers, invoices, and payments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3">
              {primaryTenant.customers.map((customer) => (
                <div key={customer.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{customer.fullName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {customer.accountNumber} - {customer.activePlan}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(customer.status)}`}>
                      {customer.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Renews {formatDate(customer.renewsAt)} - Balance{" "}
                    {formatCurrency(customer.balance, primaryTenant.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <h3 className="font-semibold">Latest invoices</h3>
              <div className="mt-3 grid gap-3">
                {primaryTenant.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="grid gap-1 border-b border-foreground/10 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {invoice.customerName} - Due {formatDate(invoice.dueDate)}
                    </p>
                    <p className="text-sm">
                      {formatCurrency(invoice.balance, primaryTenant.currency)} outstanding of{" "}
                      {formatCurrency(invoice.amount, primaryTenant.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <h3 className="font-semibold">Recent collections</h3>
              <div className="mt-3 grid gap-3">
                {primaryTenant.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{payment.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.method.replaceAll("_", " ")} - {formatDate(payment.paidAt)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(payment.amount, primaryTenant.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-foreground/10 bg-background/80">
          <CardHeader>
            <CardDescription>Mikhmon-style products</CardDescription>
            <CardTitle>Plans ready for hotspot and PPPoE operations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {primaryTenant.plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.profileName} - {plan.serviceType}
                    </p>
                  </div>
                  <p className="text-xl font-semibold">
                    {formatCurrency(plan.price, primaryTenant.currency)}
                  </p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {formatSpeed(plan.speedDownKbps, plan.speedUpKbps)} - {plan.validityDays} day validity
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
