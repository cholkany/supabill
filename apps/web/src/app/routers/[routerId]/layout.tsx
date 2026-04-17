import { notFound } from "next/navigation";

import RouterSidebar from "@/components/router-sidebar";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ routerId: string }>;
}) {
  const { routerId } = await params;
  const session = await requireUserSession();
  const router = await getRouterDashboard(routerId, {
    cookieHeader: session.requestCookieHeader,
  }).catch(() => null);

  if (!router) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <div className="mb-4 rounded-2xl border border-foreground/10 bg-background/80 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Router dashboard</p>
        <h1 className="text-2xl font-semibold">{router.name}</h1>
        <p className="text-sm text-muted-foreground">
          {router.location} - WAN {router.wanPort} - Hotspot ports {router.hotspotPorts.join(", ")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <RouterSidebar routerId={routerId} />
        <div>{children}</div>
      </div>
    </main>
  );
}
