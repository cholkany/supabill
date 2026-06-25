import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

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

// We'll use a direct PG client to do the baseline checks
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();

  // 1. Check if user table exists (meaning database is already initialized)
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user'
    );
  `);
  const userTableExists = tableCheck.rows[0].exists;

  if (userTableExists) {
    console.log("Database tables already exist. Baselining migrations...");

    // Ensure drizzle schema and __drizzle_migrations table exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        "id" SERIAL PRIMARY KEY,
        "hash" text NOT NULL,
        "created_at" bigint
      );
    `);

    // Read first migration file (0000_sticky_silverclaw.sql)
    const firstMigrationPath = resolve(__dirname, "./src/migrations/0000_sticky_silverclaw.sql");
    if (existsSync(firstMigrationPath)) {
      const fileContent = readFileSync(firstMigrationPath, "utf8");
      const fileHash = createHash("sha256").update(fileContent).digest("hex");

      // Check if 0000 is already in __drizzle_migrations table
      const migrationCheck = await client.query(`
        SELECT id FROM "drizzle"."__drizzle_migrations" WHERE hash = $1;
      `, [fileHash]);

      if (migrationCheck.rows.length === 0) {
        console.log("Recording 0000_sticky_silverclaw as already applied...");
        await client.query(`
          INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
          VALUES ($1, $2);
        `, [fileHash, Date.now()]);
      } else {
        console.log("Migration 0000_sticky_silverclaw is already recorded.");
      }
    }

    // Check if second migration is already applied (does column router_os_version exist in managed_router?)
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'managed_router' 
        AND column_name = 'router_os_version'
      );
    `);
    const columnExists = columnCheck.rows[0].exists;

    if (columnExists) {
      const secondMigrationPath = resolve(__dirname, "./src/migrations/0001_curved_maverick.sql");
      if (existsSync(secondMigrationPath)) {
        const fileContent = readFileSync(secondMigrationPath, "utf8");
        const fileHash = createHash("sha256").update(fileContent).digest("hex");

        const migrationCheck = await client.query(`
          SELECT id FROM "drizzle"."__drizzle_migrations" WHERE hash = $1;
        `, [fileHash]);

        if (migrationCheck.rows.length === 0) {
          console.log("Recording 0001_curved_maverick as already applied...");
          await client.query(`
            INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
            VALUES ($1, $2);
          `, [fileHash, Date.now()]);
        } else {
          console.log("Migration 0001_curved_maverick is already recorded.");
        }
      }
    }
  }
} catch (err) {
  console.warn("Baseline check failed, proceeding with default migration runner:", err);
} finally {
  await client.end();
}

// Run standard migrations via drizzle-orm
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
