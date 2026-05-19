"use server";

import { revalidatePath } from "next/cache";
import { requireUserSession } from "@/lib/session";
import { env } from "@supabill/env/web";

export async function deleteRouterAction(routerId: string) {
  const session = await requireUserSession();

  const res = await fetch(
    `${env.INTERNAL_SERVER_URL ?? env.NEXT_PUBLIC_SERVER_URL}/api/routers/${routerId}`,
    {
      method: "DELETE",
      headers: { cookie: session.requestCookieHeader },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to delete router");
  }

  revalidatePath("/routers");
}
