CREATE TYPE "public"."customer_status" AS ENUM('active', 'grace', 'suspended', 'offline');--> statement-breakpoint
CREATE TYPE "public"."feature_status" AS ENUM('planned', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'finance', 'support');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'mobile_money', 'card');--> statement-breakpoint
CREATE TYPE "public"."wireguard_peer_status" AS ENUM('connected', 'pending', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."router_role" AS ENUM('core', 'branch', 'pop', 'lab');--> statement-breakpoint
CREATE TYPE "public"."router_status" AS ENUM('online', 'warning', 'offline');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('hotspot', 'pppoe', 'static', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'trial', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."managed_router_log_level" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."managed_router_status" AS ENUM('pending', 'bootstrap_generated', 'connecting', 'connected', 'syncing', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."router_setup_status" AS ENUM('provision_script_generated', 'provision_fetched', 'reachable', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wireguard_tunnel_status" AS ENUM('pending', 'applied', 'error');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "router_desired_config" (
	"id" text PRIMARY KEY NOT NULL,
	"router_id" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "router_desired_config_router_id_unique" UNIQUE("router_id")
);
--> statement-breakpoint
CREATE TABLE "business_feature" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"name" text NOT NULL,
	"status" "feature_status" DEFAULT 'planned' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"full_name" text NOT NULL,
	"phone_number" text,
	"email" text,
	"account_number" text NOT NULL,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"subscription_id" text,
	"invoice_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"invoice_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"reference" text,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "router" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"site_name" text NOT NULL,
	"role" "router_role" DEFAULT 'branch' NOT NULL,
	"status" "router_status" DEFAULT 'online' NOT NULL,
	"host" text NOT NULL,
	"api_port" integer DEFAULT 8728 NOT NULL,
	"username" text NOT NULL,
	"password_hint" text,
	"router_os_version" text,
	"last_seen_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"service_type" "service_type" DEFAULT 'hotspot' NOT NULL,
	"profile_name" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"validity_days" integer DEFAULT 30 NOT NULL,
	"speed_down_kbps" integer NOT NULL,
	"speed_up_kbps" integer NOT NULL,
	"burst_profile" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"router_id" text,
	"mikrotik_username" text NOT NULL,
	"mikrotik_secret" text,
	"ip_address" text,
	"mac_address" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"renews_at" timestamp NOT NULL,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'Africa/Juba' NOT NULL,
	"contact_email" text,
	"primary_color" text DEFAULT '#157f6b' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'admin' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wireguard_peer" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"router_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "wireguard_peer_status" DEFAULT 'pending' NOT NULL,
	"public_key" text NOT NULL,
	"preshared_key" text,
	"allowed_ips" text NOT NULL,
	"endpoint" text NOT NULL,
	"interface_address" text NOT NULL,
	"dns" text DEFAULT '1.1.1.1' NOT NULL,
	"persistent_keepalive" integer DEFAULT 25 NOT NULL,
	"last_handshake_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managed_router" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"setup_id" text,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"host" text NOT NULL,
	"api_port" integer DEFAULT 8728 NOT NULL,
	"api_username" text NOT NULL,
	"api_password_encrypted" text NOT NULL,
	"status" "managed_router_status" DEFAULT 'pending' NOT NULL,
	"wan_port" text DEFAULT 'ether1' NOT NULL,
	"hotspot_ports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alerting_enabled" boolean DEFAULT true NOT NULL,
	"timezone" text DEFAULT 'Africa/Juba' NOT NULL,
	"dns_servers" jsonb DEFAULT '["1.1.1.1","8.8.8.8"]'::jsonb NOT NULL,
	"ntp_servers" jsonb DEFAULT '["pool.ntp.org"]'::jsonb NOT NULL,
	"claim_code" text,
	"last_heartbeat_at" timestamp,
	"tunnel_ip" text,
	"cpu_load_percent" integer,
	"memory_usage_percent" integer,
	"serial_number" text,
	"architecture" text,
	"router_identity" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_probe_at" timestamp,
	"last_error" text,
	CONSTRAINT "managed_router_claim_code_unique" UNIQUE("claim_code")
);
--> statement-breakpoint
CREATE TABLE "managed_router_log" (
	"id" text PRIMARY KEY NOT NULL,
	"router_id" text NOT NULL,
	"level" "managed_router_log_level" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managed_router_setup" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"router_name" text NOT NULL,
	"location" text NOT NULL,
	"status" "router_setup_status" DEFAULT 'provision_script_generated' NOT NULL,
	"step" integer DEFAULT 2 NOT NULL,
	"provision_token" text NOT NULL,
	"provision_url" text NOT NULL,
	"provision_script" text NOT NULL,
	"api_username" text NOT NULL,
	"api_password_encrypted" text NOT NULL,
	"detected_host" text,
	"api_port" integer DEFAULT 8728 NOT NULL,
	"provision_fetched_at" timestamp,
	"reachable_at" timestamp,
	"all_ports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hotspot_candidate_ports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_hotspot_ports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"setup_logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_router_id" text,
	"last_heartbeat_at" timestamp,
	"cpu_load_percent" integer,
	"memory_usage_percent" integer,
	"router_os_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "managed_router_setup_provision_token_unique" UNIQUE("provision_token")
);
--> statement-breakpoint
CREATE TABLE "managed_router_wireguard" (
	"id" text PRIMARY KEY NOT NULL,
	"router_id" text NOT NULL,
	"router_interface_name" text DEFAULT 'supabill-wg' NOT NULL,
	"router_listen_port" integer DEFAULT 51820 NOT NULL,
	"router_private_key_encrypted" text NOT NULL,
	"router_public_key" text NOT NULL,
	"router_tunnel_ip" text NOT NULL,
	"peer_private_key_encrypted" text NOT NULL,
	"peer_public_key" text NOT NULL,
	"peer_tunnel_ip" text NOT NULL,
	"wan_host" text,
	"status" "wireguard_tunnel_status" DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "managed_router_wireguard_router_id_unique" UNIQUE("router_id")
);
--> statement-breakpoint
CREATE TABLE "wireguard_hub" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key_encrypted" text NOT NULL,
	"endpoint" text NOT NULL,
	"listen_port" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "router_desired_config" ADD CONSTRAINT "router_desired_config_router_id_managed_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."managed_router"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_feature" ADD CONSTRAINT "business_feature_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "router" ADD CONSTRAINT "router_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_plan" ADD CONSTRAINT "service_plan_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_service_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."service_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_router_id_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."router"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_membership" ADD CONSTRAINT "tenant_membership_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_membership" ADD CONSTRAINT "tenant_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wireguard_peer" ADD CONSTRAINT "wireguard_peer_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wireguard_peer" ADD CONSTRAINT "wireguard_peer_router_id_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."router"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_router" ADD CONSTRAINT "managed_router_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_router" ADD CONSTRAINT "managed_router_setup_id_managed_router_setup_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."managed_router_setup"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_router_log" ADD CONSTRAINT "managed_router_log_router_id_managed_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."managed_router"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_router_setup" ADD CONSTRAINT "managed_router_setup_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_router_wireguard" ADD CONSTRAINT "managed_router_wireguard_router_id_managed_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."managed_router"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "business_feature_tenant_idx" ON "business_feature" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "business_feature_key_idx" ON "business_feature" USING btree ("feature_key");--> statement-breakpoint
CREATE INDEX "customer_tenant_idx" ON "customer" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customer_account_idx" ON "customer" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "invoice_tenant_idx" ON "invoice" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoice_customer_idx" ON "invoice" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoice_number_idx" ON "invoice" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "payment_tenant_idx" ON "payment" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_customer_idx" ON "payment" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payment_invoice_idx" ON "payment" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "router_tenant_idx" ON "router" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_plan_tenant_idx" ON "service_plan" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscription_tenant_idx" ON "subscription" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscription_customer_idx" ON "subscription" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "subscription_router_idx" ON "subscription" USING btree ("router_id");--> statement-breakpoint
CREATE INDEX "tenant_membership_tenant_idx" ON "tenant_membership" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_membership_user_idx" ON "tenant_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wireguard_peer_tenant_idx" ON "wireguard_peer" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wireguard_peer_router_idx" ON "wireguard_peer" USING btree ("router_id");--> statement-breakpoint
CREATE INDEX "managed_router_user_idx" ON "managed_router" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "managed_router_setup_idx" ON "managed_router" USING btree ("setup_id");--> statement-breakpoint
CREATE INDEX "managed_router_log_router_idx" ON "managed_router_log" USING btree ("router_id");--> statement-breakpoint
CREATE INDEX "managed_router_setup_user_idx" ON "managed_router_setup" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "managed_router_setup_token_idx" ON "managed_router_setup" USING btree ("provision_token");--> statement-breakpoint
CREATE INDEX "managed_router_wireguard_router_idx" ON "managed_router_wireguard" USING btree ("router_id");