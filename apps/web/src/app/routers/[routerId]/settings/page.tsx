import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterSettingsPage({
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
    <section className="grid gap-4">
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>Network settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>Timezone: {router.settings.timezone}</p>
          <p>DNS servers: {router.settings.dnsServers.join(", ")}</p>
          <p>NTP servers: {router.settings.ntpServers.join(", ")}</p>
          <p>Alerting enabled: {router.settings.alertingEnabled ? "Yes" : "No"}</p>
        </CardContent>
      </Card>
    </section>
  );
}
