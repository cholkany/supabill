import { db } from "@supabill/db";
import * as schema from "@supabill/db/schema/auth";
import { env, getTrustedOrigins } from "@supabill/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const isProduction = process.env.NODE_ENV === "production";
const authUrl = env.BETTER_AUTH_URL;
const isHttps = authUrl.startsWith("https://");

export const auth = betterAuth({
  baseURL: authUrl,
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      // Only set secure/sameSite=none when actually served over HTTPS.
      // HTTP deployments (local Docker, dev) must use lax/non-secure or
      // the browser silently drops all session cookies.
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
      httpOnly: true,
    },
  },
  plugins: [],
});
