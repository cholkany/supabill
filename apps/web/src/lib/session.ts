import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "./auth-client";

import { env } from "@supabill/env/web";

export async function requireUserSession() {
  const requestHeaders = await headers();
  const session = await authClient.getSession({
    fetchOptions: {
      headers: requestHeaders,
      baseURL: `${env.INTERNAL_SERVER_URL || env.NEXT_PUBLIC_SERVER_URL}/api/auth`,
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return {
    ...session,
    requestCookieHeader: requestHeaders.get("cookie") ?? "",
  };
}
