export default function Home() {
  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(21,127,107,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(204,139,57,0.18),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(242,247,244,0.92))] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(21,127,107,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(204,139,57,0.18),_transparent_30%),linear-gradient(180deg,_rgba(7,16,13,0.98),_rgba(11,23,19,0.96))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="grid gap-6 rounded-[2rem] border border-foreground/10 bg-background/80 p-6 shadow-[0_40px_120px_-60px_rgba(21,127,107,0.8)] backdrop-blur md:grid-cols-[1.15fr_0.85fr] md:p-10">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.35em] text-primary">Supabill</p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
              MikroTik billing built for ISPs that need Mikhmon speed with SaaS structure.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Supabill combines tenant-aware billing, router operations, and built-in WireGuard remote
              access into one platform designed to keep growing as your business adds custom workflows.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
                href="/routers"
              >
                Open routers
              </a>
              <a
                className="inline-flex h-11 items-center rounded-full border border-foreground/10 px-5 text-sm font-medium"
                href="http://localhost:3000/api/platform/overview"
                target="_blank"
                rel="noreferrer"
              >
                View API
              </a>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.75rem] border border-foreground/10 bg-foreground/[0.03] p-4">
            {[
              "Multitenant ISP operations",
              "Mikhmon-inspired hotspot and PPPoE plans",
              "Invoices, payments, and collections tracking",
              "WireGuard access profiles for field teams and NOC staff",
              "Feature registry for future custom business modules",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-foreground/10 bg-background/70 p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Router control", text: "Track sites, RouterOS versions, API users, and operational status." },
            { title: "Billing core", text: "Manage customers, subscriptions, invoices, balances, and collections." },
            { title: "Remote support", text: "Ship built-in WireGuard profiles for secure remote maintenance." },
            { title: "Extensible design", text: "Add future modules without rebuilding the entire product model." },
          ].map((item) => (
            <div key={item.title} className="rounded-[1.75rem] border border-foreground/10 bg-background/80 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{item.title}</p>
              <p className="mt-3 text-base">{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
