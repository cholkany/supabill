import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRouters } from "@/lib/router-flow";
import { requireUserSession } from "@/lib/session";
import { DeleteRouterButton } from "./delete-router-button";

export default async function RoutersPage() {
  const session = await requireUserSession();
  const { routers } = await getUserRouters({ cookieHeader: session.requestCookieHeader });

  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Supabill routers</p>
          <h1 className="text-3xl font-semibold tracking-tight">Routers</h1>
        </div>
        <Link href={"/routers/new" as Route}>
          <Button>Add router</Button>
        </Link>
      </div>

      {routers.length === 0 ? (
        <Card className="rounded-3xl border-foreground/10 bg-background/90">
          <CardHeader>
            <CardTitle>No routers yet</CardTitle>
            <CardDescription>
              Start by adding your first MikroTik device. You will get a provision script and guided setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={"/routers/new" as Route}>
              <Button>Add router</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routers.map((router) => (
            <Card key={router.id} className="rounded-2xl border-foreground/10 bg-background/90">
              <CardHeader>
                <CardTitle>{router.name}</CardTitle>
                <CardDescription>
                  {router.location} - Status: {router.status}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <p>WAN: {router.wanPort}</p>
                <p>Hotspot ports: {router.hotspotPorts.join(", ") || "Not assigned"}</p>
                <Link href={`/routers/${router.id}` as Route}>
                  <Button variant="outline">Open dashboard</Button>
                </Link>
                <DeleteRouterButton routerId={router.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
