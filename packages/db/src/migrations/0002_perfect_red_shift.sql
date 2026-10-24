DO $$
DECLARE
  has_legacy_rows boolean;
BEGIN
  IF to_regclass('public.router') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM router)' INTO has_legacy_rows;
    IF has_legacy_rows THEN
      RAISE EXCEPTION 'Legacy router data exists. Resolve it before applying tenant ownership migration 0002.';
    END IF;
  END IF;

  IF to_regclass('public.wireguard_peer') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM wireguard_peer)' INTO has_legacy_rows;
    IF has_legacy_rows THEN
      RAISE EXCEPTION 'Legacy wireguard_peer data exists. Resolve it before applying tenant ownership migration 0002.';
    END IF;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM tenant_membership
    GROUP BY tenant_id, user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate tenant_membership rows exist. Resolve them before applying migration 0002.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "managed_router" ADD COLUMN "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "managed_router_setup" ADD COLUMN "tenant_id" text;
--> statement-breakpoint
DO $$
DECLARE
  target_user RECORD;
  new_tenant_id text;
  base_slug text;
  new_slug text;
BEGIN
  FOR target_user IN
    SELECT u.id, u.name, u.email
    FROM "user" u
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_membership m WHERE m.user_id = u.id
    )
  LOOP
    new_tenant_id := gen_random_uuid()::text;
    base_slug := lower(regexp_replace(
      coalesce(nullif(target_user.name, ''), split_part(target_user.email, '@', 1)),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    ));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'tenant';
    END IF;

    new_slug := base_slug || '-' || substr(md5(target_user.id), 1, 6);
    WHILE EXISTS (SELECT 1 FROM tenant t WHERE t.slug = new_slug) LOOP
      new_slug := base_slug || '-' || substr(md5(random()::text), 1, 8);
    END LOOP;

    INSERT INTO tenant (id, name, slug, status, contact_email)
    VALUES (
      new_tenant_id,
      coalesce(nullif(target_user.name, ''), split_part(target_user.email, '@', 1)),
      new_slug,
      'trial',
      target_user.email
    );

    INSERT INTO tenant_membership (id, tenant_id, user_id, role, is_default)
    VALUES (
      gen_random_uuid()::text,
      new_tenant_id,
      target_user.id,
      'owner',
      true
    );
  END LOOP;
END $$;
--> statement-breakpoint
UPDATE "managed_router" AS mr
SET "tenant_id" = membership."tenant_id"
FROM (
  SELECT DISTINCT ON (user_id) user_id, tenant_id
  FROM tenant_membership
  ORDER BY user_id, is_default DESC, created_at ASC
) AS membership
WHERE membership.user_id = mr."user_id"
  AND mr."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "managed_router_setup" AS setup
SET "tenant_id" = membership."tenant_id"
FROM (
  SELECT DISTINCT ON (user_id) user_id, tenant_id
  FROM tenant_membership
  ORDER BY user_id, is_default DESC, created_at ASC
) AS membership
WHERE membership.user_id = setup."user_id"
  AND setup."tenant_id" IS NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM managed_router WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'managed_router rows could not be assigned to a Tenant.';
  END IF;

  IF EXISTS (SELECT 1 FROM managed_router_setup WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'managed_router_setup rows could not be assigned to a Tenant.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "managed_router" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "managed_router_setup" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "managed_router" ADD CONSTRAINT "managed_router_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "managed_router_setup" ADD CONSTRAINT "managed_router_setup_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_membership_tenant_user_unique" ON "tenant_membership" USING btree ("tenant_id","user_id");
--> statement-breakpoint
CREATE INDEX "managed_router_tenant_idx" ON "managed_router" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "managed_router_setup_tenant_idx" ON "managed_router_setup" USING btree ("tenant_id");
