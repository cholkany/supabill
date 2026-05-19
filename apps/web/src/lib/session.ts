import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@supabill/env/web";

const serverUrl = env.INTERNAL_SERVER_URL ?? env.NEXT_PUBLIC_SERVER_URL;

export async function requireUserSession() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";

  const res = await fetch(`${serverUrl}/api/auth/get-session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    redirect("/login");
  }

  const session = await res.json() as { user?: { id: string; email: string; name: string } } | null;

  if (!session?.user) {
    redirect("/login");
  }

  return {
    user: session.user!,
    requestCookieHeader: cookieHeader,
  };
}
