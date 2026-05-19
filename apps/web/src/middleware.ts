import { NextRequest, NextResponse } from "next/server";

// This runs at request time, so INTERNAL_SERVER_URL is read from the live
// environment — not baked in at build time like next.config rewrites.
const SERVER_URL =
  process.env.INTERNAL_SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:3000";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const target = `${SERVER_URL}${pathname}${search}`;

  // Forward all headers, keeping the original host so the server knows
  // the public-facing URL (needed to build the provision script URL).
  const headers = new Headers(request.headers);
  // Tell the upstream server the real public host/proto in case it reads them.
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  // The fetch target needs a resolvable host header for the Docker network.
  headers.set("host", new URL(SERVER_URL).host);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    // @ts-expect-error — Node fetch needs this to stream the body
    duplex: "half",
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const config = {
  matcher: ["/api/:path*", "/provision/:path*"],
};
