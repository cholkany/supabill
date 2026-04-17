import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireUserSession } from "@/lib/session";

export default async function DashboardPage() {
  await requireUserSession();
  redirect("/routers" as Route);
}
