import { PgBoss } from "pg-boss";
import { env } from "@supabill/env/server";

if (!env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be configured for pg-boss",
  );
}

const dbUrl = env.DATABASE_URL;
const requiresSsl =
  dbUrl.includes("sslmode=") ||
  dbUrl.includes("ssl=true") ||
  (!dbUrl.includes("localhost") &&
    !dbUrl.includes("127.0.0.1") &&
    !dbUrl.includes("@db:"));

export const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

boss.on("error", (error) => {
  console.error(
    "[PgBoss] Job queue error:",
    error,
  );
});

let isStarted = false;

async function createQueues() {
  await boss.createQueue(
    "router-provision",
  );

  await boss.createQueue(
    "router-sync",
  );

  await boss.createQueue(
    "router-heartbeat-check",
  );

  console.log(
    "[PgBoss] All queues created",
  );
}

export async function startQueue() {
  if (isStarted) return;

  try {
    await boss.start();

    console.log(
      "[PgBoss] Job queue started",
    );

    await createQueues();

    isStarted = true;
  } catch (error) {
    console.error(
      "[PgBoss] Failed to start job queue:",
      error,
    );

    throw error;
  }
}