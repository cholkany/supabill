import { AppSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NavBar } from "@/components/dashboard/nav-bar";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

/*export default async function RouterMainDashboardPage({
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
    <>
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
    </>
  );
}*/

export default async function DashboardPage({
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
    <>
      <AppSidebar routerId={routerId} />
      <SidebarInset>
        <NavBar title={"Dashboard"} />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
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
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </SidebarInset>
    </>
  );
}
