import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL environment variable is missing!");
  process.exit(1);
}

const requiresSsl =
  dbUrl.includes("sslmode=") ||
  dbUrl.includes("ssl=true") ||
  (!dbUrl.includes("localhost") &&
    !dbUrl.includes("127.0.0.1") &&
    !dbUrl.includes("@db:"));

console.log("Connecting to database...", {
  host: dbUrl.split("@")[1] || "unknown",
  requiresSsl,
});

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool);

async function run() {
  try {
    const migrationsFolder = resolve(__dirname, "./src/migrations");
    console.log("Applying migrations from:", migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log("Migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed with error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
