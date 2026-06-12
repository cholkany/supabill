import { db } from "@supabill/db";
import { managedRouter } from "@supabill/db/schema";
import { eq } from "drizzle-orm";

export function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0, O, 1, I
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SB-${part1}-${part2}`;
}

export async function getRouterByClaimCode(code: string) {
  return db.query.managedRouter.findFirst({
    where: eq(managedRouter.claimCode, code),
  });
}
