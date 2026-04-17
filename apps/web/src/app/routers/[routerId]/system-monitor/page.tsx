import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterSystemMonitorPage({
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
    <section className="grid gap-4 md:grid-cols-2">
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>System health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>Uptime: {router.systemMonitor.uptime}</p>
          <p>Temperature: {router.systemMonitor.temperatureC} C</p>
          <p>Voltage: {router.systemMonitor.voltage} V</p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>Firmware</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>RouterOS: {router.systemMonitor.routerOsVersion}</p>
          <p>RouterBOOT: {router.systemMonitor.firmware}</p>
          <p>Last seen: {router.lastSeenAt}</p>
        </CardContent>
      </Card>
    </section>
  );
}
