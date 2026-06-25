import { env } from "@supabill/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.js";

const dbUrl = env.DATABASE_URL;
const requiresSsl =
  dbUrl.includes("sslmode=") ||
  dbUrl.includes("ssl=true") ||
  (!dbUrl.includes("localhost") &&
    !dbUrl.includes("127.0.0.1") &&
    !dbUrl.includes("@db:"));

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

