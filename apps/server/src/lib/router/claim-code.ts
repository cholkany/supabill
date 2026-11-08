import { randomInt } from "node:crypto";
import { db } from "@supabill/db";
import { managedRouter } from "@supabill/db/schema";
import { eq } from "drizzle-orm";

export function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0, O, 1, I
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(randomInt(chars.length));
    part2 += chars.charAt(randomInt(chars.length));
  }
  return `SB-${part1}-${part2}`;
}

// Claim codes are onboarding credentials; stop accepting them after a day.
const CLAIM_CODE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getRouterByClaimCode(code: string) {
  const router = await db.query.managedRouter.findFirst({
    where: eq(managedRouter.claimCode, code),
  });
  if (!router) return null;
  if (Date.now() - router.createdAt.getTime() > CLAIM_CODE_TTL_MS) return null;
  return router;
}
