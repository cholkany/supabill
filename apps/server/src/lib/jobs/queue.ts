import { PgBoss } from "pg-boss";
import { env } from "@supabill/env/server";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured for pg-boss");
}

export const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  max: 10,
});

boss.on("error", (error) => {
  console.error("[PgBoss] Job queue error:", error);
});

let isStarted = false;

export async function startQueue() {
  if (isStarted) return;
  try {
    await boss.start();
    console.log("[PgBoss] Job queue started successfully.");
    isStarted = true;
  } catch (error) {
    console.error("[PgBoss] Failed to start job queue:", error);
    throw error;
  }
}
