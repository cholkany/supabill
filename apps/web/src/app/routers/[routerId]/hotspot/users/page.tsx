import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterHotspotUsersPage({
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
      {router.hotspotUsers.map((user) => (
        <Card key={user.id} className="rounded-2xl border-foreground/10 bg-background/90">
          <CardHeader>
            <CardTitle>{user.username}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            <p>Profile: {user.profile}</p>
            <p>Status: {user.status}</p>
            <p>IP address: {user.ipAddress}</p>
            <p>Uptime: {user.uptime}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
