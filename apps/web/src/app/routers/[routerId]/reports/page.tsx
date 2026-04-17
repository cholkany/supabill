import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterReportsPage({
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
          <CardTitle>Traffic report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>Traffic today: {router.reports.trafficTodayGb} GB</p>
          <p>Traffic this month: {router.reports.trafficMonthGb} GB</p>
          <p>Unique users today: {router.reports.uniqueHotspotUsersToday}</p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-foreground/10 bg-background/90">
        <CardHeader>
          <CardTitle>Revenue report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>Revenue today: ${router.reports.revenueToday}</p>
          <p>Revenue this month: ${router.reports.revenueMonth}</p>
        </CardContent>
      </Card>
    </section>
  );
}
