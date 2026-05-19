import { AppSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NavBar } from "@/components/dashboard/nav-bar";
import { HotspotProfilesTable } from "@/components/hotspot/profiles-table";
import HotspotUsersTable from "@/components/hotspot/users-table";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";
import { getRouterDashboard } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";
import { PlusIcon } from "lucide-react";

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
    <>
      <AppSidebar routerId={routerId} />
      <SidebarInset>
        <NavBar title={"Hotspot Users"} />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold">Hotspot Users</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage users for your hotspot profiles.</p>
            </div>
          </div>
          <HotspotUsersTable users={router.hotspotUsers} />
        </div>
      </SidebarInset>
    </>
  );
}


