import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterMainDashboardPage({
  params,
}: {
  params: Promise<{ routerId: string }>;
}) {
  const { routerId } = await params;
  const session = await requireUserSession();
  const router = await getRouterDashboard(routerId, {
    cookieHeader: session.requestCookieHeader,
  });

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>Active users</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{router.stats.activeUsers}</CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>CPU load</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{router.stats.cpuLoadPercent}%</CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>Memory usage</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{router.stats.memoryUsagePercent}%</CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>TX throughput</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{router.stats.txMbps} Mbps</CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>RX throughput</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{router.stats.rxMbps} Mbps</CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{router.stats.activeSessions}</CardContent>
      </Card>
    </section>
  );
}
