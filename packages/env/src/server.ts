import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    /** Comma-separated extra allowed origins (e.g. http://localhost:3000 in production). */
    TRUSTED_ORIGINS: z.string().optional(),
    ROUTER_CREDENTIALS_KEY: z.string().min(32).optional(),
    // Publicly reachable base URL (DNS name) used in the RouterOS provision script.
    // e.g. https://api.yourdomain.com  — must be reachable by the MikroTik router.
    SERVER_PUBLIC_URL: z.url().optional(),
    // Supabill's publicly reachable hostname/IP — MikroTik routers dial TO this as WG client.
    
    WG_PUBLIC_HOST: z.string().optional(),
    WG_LISTEN_PORT: z.coerce.number().int().default(51820),
    // Directory where per-router wg peer configs are written (read by the wireguard Docker service).
    WG_CONFS_DIR: z.string().optional(),
    ROUTER_API_TIMEOUT_MS: z.coerce.number().int().min(2000).max(30000).default(7000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    MIKROTIK_LAN_IP: z.string().optional(),
    MIKROTIK_USERNAME: z.string().optional(),
    MIKROTIK_PASSWORD: z.string().optional(),
    WG_SERVER_PRIVATE_KEY: z.string().optional(),
    WG_SERVER_PUBLIC_KEY: z.string().optional(),
    WG_ENDPOINT: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

/** Origins allowed for Better Auth and Hono CORS (primary + optional extras). */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>([env.CORS_ORIGIN]);
  if (env.TRUSTED_ORIGINS) {
    for (const part of env.TRUSTED_ORIGINS.split(",")) {
      const trimmed = part.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  return [...origins];
}
