import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const localEnv = resolve(process.cwd(), "../../apps/server/.env");
if (existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
}

const dbUrl = process.env.DATABASE_URL || "";
const requiresSsl =
  dbUrl.includes("sslmode=") ||
  dbUrl.includes("ssl=true") ||
  (!dbUrl.includes("localhost") &&
    !dbUrl.includes("127.0.0.1") &&
    !dbUrl.includes("@db:"));

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  },
});

