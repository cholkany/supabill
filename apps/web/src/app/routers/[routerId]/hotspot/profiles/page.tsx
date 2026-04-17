import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";

export default async function RouterHotspotProfilesPage({
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
      {router.hotspotProfiles.map((profile) => (
        <Card key={profile.id} className="rounded-2xl border-foreground/10 bg-background/90">
          <CardHeader>
            <CardTitle>{profile.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            <p>Rate limit: {profile.rateLimit}</p>
            <p>Shared users: {profile.sharedUsers}</p>
            <p>Session timeout: {profile.sessionTimeoutMinutes} min</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
