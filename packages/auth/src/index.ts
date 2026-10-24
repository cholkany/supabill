import { db } from "@supabill/db";
import * as schema from "@supabill/db/schema/auth";
import { ensurePersonalTenantForUser } from "@supabill/db/tenancy";
import { env, getTrustedOrigins } from "@supabill/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await ensurePersonalTenantForUser(user);
          } catch (error) {
            console.error("[auth] Failed to create the personal Tenant during sign-up:", error);
          }
        },
      },
    },
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
