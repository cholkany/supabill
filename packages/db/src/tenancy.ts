import { desc, eq, sql } from "drizzle-orm";

import { db } from "./index.js";
import { user } from "./schema/auth.js";
import { tenant, tenantMembership } from "./schema/platform.js";

type TenantUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function slugBase(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomSuffix(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 6);
}

export async function getDefaultTenantIdForUser(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ tenantId: tenantMembership.tenantId })
    .from(tenantMembership)
    .where(eq(tenantMembership.userId, userId))
    .orderBy(desc(tenantMembership.isDefault), tenantMembership.createdAt)
    .limit(1);

  return membership?.tenantId ?? null;
}

export async function ensurePersonalTenantForUser(input: TenantUser): Promise<string> {
  const existingTenantId = await getDefaultTenantIdForUser(input.id);
  if (existingTenantId) {
    return existingTenantId;
  }

  let tenantId: string | null = null;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM "user" WHERE id = ${input.id} FOR UPDATE`);

    const [membership] = await tx
      .select({ tenantId: tenantMembership.tenantId })
      .from(tenantMembership)
      .where(eq(tenantMembership.userId, input.id))
      .orderBy(desc(tenantMembership.isDefault), tenantMembership.createdAt)
      .limit(1);

    if (membership) {
      tenantId = membership.tenantId;
      return;
    }

    let name = input.name?.trim() || "";
    let email = input.email?.trim() || "";

    if (!name || !email) {
      const [record] = await tx
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);

      if (!record) {
        throw new Error(`User ${input.id} not found while creating a personal Tenant.`);
      }

      name = name || record.name;
      email = email || record.email;
    }

    const base = slugBase(name || email.split("@")[0] || "") || "tenant";
    let slug = `${base}-${randomSuffix()}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [existing] = await tx
        .select({ id: tenant.id })
        .from(tenant)
        .where(eq(tenant.slug, slug))
        .limit(1);

      if (!existing) break;
      slug = `${base}-${randomSuffix()}`;
    }

    const newTenantId = crypto.randomUUID();

    await tx.insert(tenant).values({
      id: newTenantId,
      name: name || email.split("@")[0] || "Personal",
      slug,
      status: "trial",
      contactEmail: email || null,
    });

    await tx.insert(tenantMembership).values({
      id: crypto.randomUUID(),
      tenantId: newTenantId,
      userId: input.id,
      role: "owner",
      isDefault: true,
    });

    tenantId = newTenantId;
  });

  if (!tenantId) {
    throw new Error(`Could not resolve a Tenant for user ${input.id}.`);
  }

  return tenantId;
}
