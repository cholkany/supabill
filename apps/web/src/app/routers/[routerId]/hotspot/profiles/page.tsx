import { AppSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NavBar } from "@/components/dashboard/nav-bar";
import { HotspotProfilesTable } from "@/components/hotspot/profiles-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset } from "@/components/ui/sidebar";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";
import { PlusIcon } from "lucide-react";

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
    <>
      <AppSidebar routerId={routerId} />
      <SidebarInset>
        <NavBar title={"Hotspot Profiles"} />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold">Hotspot Profiles</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage bandwidth plans, pricing, and access policies for your hotspot users.</p>
            </div>
            <Button variant="default">
              <PlusIcon className="size-4 mr-2" />
              Create New Profile
            </Button>
          </div>
          <HotspotProfilesTable profiles={router.hotspotProfiles} />
        </div>
      </SidebarInset>
    </>
  );
}


