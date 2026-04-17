"use client";
import Link from "next/link";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links: Array<{ to: string; label: string }> = [
    { to: "/", label: "Home" },
    { to: "/routers", label: "Routers" },
    { to: "/routers/new", label: "Add Router" },
  ];

  return (
    <div className="border-b border-foreground/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <a href="/" className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Supabill
          </a>
          <nav className="flex gap-4 text-sm text-muted-foreground">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to as never}>
                {label}
              </Link>
            );
          })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
