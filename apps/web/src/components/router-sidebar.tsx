import Link from "next/link";
import type { Route } from "next";

export default function RouterSidebar({ routerId }: { routerId: string }) {
  const base = `/routers/${routerId}`;

  return (
    <aside className="rounded-2xl border border-foreground/10 bg-background/80 p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Router navigation</p>
      <nav className="grid gap-1 text-sm">
        <Link className="rounded-lg px-3 py-2 hover:bg-foreground/[0.05]" href={base as Route}>
          Dashboard
        </Link>
        <details open className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2">
          <summary className="cursor-pointer list-none rounded-md px-2 py-1.5 font-medium">
            Hotspot
          </summary>
          <div className="mt-1 grid gap-1">
            <Link
              className="rounded-md px-2 py-1.5 hover:bg-foreground/[0.05]"
              href={`${base}/hotspot/profiles` as Route}
            >
              Profiles
            </Link>
            <Link
              className="rounded-md px-2 py-1.5 hover:bg-foreground/[0.05]"
              href={`${base}/hotspot/users` as Route}
            >
              Users
            </Link>
          </div>
        </details>
        <Link className="rounded-lg px-3 py-2 hover:bg-foreground/[0.05]" href={`${base}/logs` as Route}>
          Logs
        </Link>
        <Link
          className="rounded-lg px-3 py-2 hover:bg-foreground/[0.05]"
          href={`${base}/system-monitor` as Route}
        >
          System monitor
        </Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-foreground/[0.05]" href={`${base}/reports` as Route}>
          Reports
        </Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-foreground/[0.05]" href={`${base}/settings` as Route}>
          Settings
        </Link>
      </nav>
    </aside>
  );
}
