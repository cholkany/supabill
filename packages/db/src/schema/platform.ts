import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "trial", "suspended"]);
export const routerStatusEnum = pgEnum("router_status", ["online", "warning", "offline"]);
export const routerRoleEnum = pgEnum("router_role", ["core", "branch", "pop", "lab"]);
export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "finance", "support"]);
export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "grace",
  "suspended",
  "offline",
]);
export const serviceTypeEnum = pgEnum("service_type", ["hotspot", "pppoe", "static", "hybrid"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "open", "paid", "overdue"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
]);
export const peerStatusEnum = pgEnum("wireguard_peer_status", ["connected", "pending", "revoked"]);
export const featureStatusEnum = pgEnum("feature_status", ["planned", "active", "archived"]);

export const tenant = pgTable("tenant", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: tenantStatusEnum("status").default("trial").notNull(),
  currency: text("currency").default("USD").notNull(),
  timezone: text("timezone").default("Africa/Juba").notNull(),
  contactEmail: text("contact_email"),
  primaryColor: text("primary_color").default("#157f6b").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const tenantMembership = pgTable(
  "tenant_membership",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").default("admin").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("tenant_membership_tenant_idx").on(table.tenantId),
    index("tenant_membership_user_idx").on(table.userId),
  ],
);

export const router = pgTable(
  "router",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    siteName: text("site_name").notNull(),
    role: routerRoleEnum("role").default("branch").notNull(),
    status: routerStatusEnum("status").default("online").notNull(),
    host: text("host").notNull(),
    apiPort: integer("api_port").default(8728).notNull(),
    username: text("username").notNull(),
    passwordHint: text("password_hint"),
    routerOsVersion: text("router_os_version"),
    lastSeenAt: timestamp("last_seen_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("router_tenant_idx").on(table.tenantId)],
);

export const wireguardPeer = pgTable(
  "wireguard_peer",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    routerId: text("router_id")
      .notNull()
      .references(() => router.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: peerStatusEnum("status").default("pending").notNull(),
    publicKey: text("public_key").notNull(),
    presharedKey: text("preshared_key"),
    allowedIps: text("allowed_ips").notNull(),
    endpoint: text("endpoint").notNull(),
    interfaceAddress: text("interface_address").notNull(),
    dns: text("dns").default("1.1.1.1").notNull(),
    persistentKeepalive: integer("persistent_keepalive").default(25).notNull(),
    lastHandshakeAt: timestamp("last_handshake_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("wireguard_peer_tenant_idx").on(table.tenantId),
    index("wireguard_peer_router_idx").on(table.routerId),
  ],
);

export const servicePlan = pgTable(
  "service_plan",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    serviceType: serviceTypeEnum("service_type").default("hotspot").notNull(),
    profileName: text("profile_name").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    validityDays: integer("validity_days").default(30).notNull(),
    speedDownKbps: integer("speed_down_kbps").notNull(),
    speedUpKbps: integer("speed_up_kbps").notNull(),
    burstProfile: text("burst_profile"),
    isActive: boolean("is_active").default(true).notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("service_plan_tenant_idx").on(table.tenantId)],
);

export const customer = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phoneNumber: text("phone_number"),
    email: text("email"),
    accountNumber: text("account_number").notNull(),
    status: customerStatusEnum("status").default("active").notNull(),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("customer_tenant_idx").on(table.tenantId),
    index("customer_account_idx").on(table.accountNumber),
  ],
);

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => servicePlan.id, { onDelete: "restrict" }),
    routerId: text("router_id").references(() => router.id, { onDelete: "set null" }),
    mikrotikUsername: text("mikrotik_username").notNull(),
    mikrotikSecret: text("mikrotik_secret"),
    ipAddress: text("ip_address"),
    macAddress: text("mac_address"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    renewsAt: timestamp("renews_at").notNull(),
    status: customerStatusEnum("status").default("active").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscription_tenant_idx").on(table.tenantId),
    index("subscription_customer_idx").on(table.customerId),
    index("subscription_router_idx").on(table.routerId),
  ],
);

export const invoice = pgTable(
  "invoice",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscription.id, { onDelete: "set null" }),
    invoiceNumber: text("invoice_number").notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("invoice_tenant_idx").on(table.tenantId),
    index("invoice_customer_idx").on(table.customerId),
    index("invoice_number_idx").on(table.invoiceNumber),
  ],
);

export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id").references(() => invoice.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").default("cash").notNull(),
    reference: text("reference"),
    paidAt: timestamp("paid_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payment_tenant_idx").on(table.tenantId),
    index("payment_customer_idx").on(table.customerId),
    index("payment_invoice_idx").on(table.invoiceId),
  ],
);

export const businessFeature = pgTable(
  "business_feature",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    name: text("name").notNull(),
    status: featureStatusEnum("status").default("planned").notNull(),
    config: jsonb("config")
      .$type<Record<string, string | number | boolean | string[]>>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("business_feature_tenant_idx").on(table.tenantId),
    index("business_feature_key_idx").on(table.featureKey),
  ],
);

export const tenantRelations = relations(tenant, ({ many }) => ({
  memberships: many(tenantMembership),
  routers: many(router),
  peers: many(wireguardPeer),
  plans: many(servicePlan),
  customers: many(customer),
  subscriptions: many(subscription),
  invoices: many(invoice),
  payments: many(payment),
  features: many(businessFeature),
}));

export const tenantMembershipRelations = relations(tenantMembership, ({ one }) => ({
  tenant: one(tenant, {
    fields: [tenantMembership.tenantId],
    references: [tenant.id],
  }),
  user: one(user, {
    fields: [tenantMembership.userId],
    references: [user.id],
  }),
}));

export const routerRelations = relations(router, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [router.tenantId],
    references: [tenant.id],
  }),
  subscriptions: many(subscription),
  peers: many(wireguardPeer),
}));

export const wireguardPeerRelations = relations(wireguardPeer, ({ one }) => ({
  tenant: one(tenant, {
    fields: [wireguardPeer.tenantId],
    references: [tenant.id],
  }),
  router: one(router, {
    fields: [wireguardPeer.routerId],
    references: [router.id],
  }),
}));

export const servicePlanRelations = relations(servicePlan, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [servicePlan.tenantId],
    references: [tenant.id],
  }),
  subscriptions: many(subscription),
}));

export const customerRelations = relations(customer, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [customer.tenantId],
    references: [tenant.id],
  }),
  subscriptions: many(subscription),
  invoices: many(invoice),
  payments: many(payment),
}));

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [subscription.tenantId],
    references: [tenant.id],
  }),
  customer: one(customer, {
    fields: [subscription.customerId],
    references: [customer.id],
  }),
  plan: one(servicePlan, {
    fields: [subscription.planId],
    references: [servicePlan.id],
  }),
  router: one(router, {
    fields: [subscription.routerId],
    references: [router.id],
  }),
  invoices: many(invoice),
}));

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [invoice.tenantId],
    references: [tenant.id],
  }),
  customer: one(customer, {
    fields: [invoice.customerId],
    references: [customer.id],
  }),
  subscription: one(subscription, {
    fields: [invoice.subscriptionId],
    references: [subscription.id],
  }),
  payments: many(payment),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  tenant: one(tenant, {
    fields: [payment.tenantId],
    references: [tenant.id],
  }),
  customer: one(customer, {
    fields: [payment.customerId],
    references: [customer.id],
  }),
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id],
  }),
}));

export const businessFeatureRelations = relations(businessFeature, ({ one }) => ({
  tenant: one(tenant, {
    fields: [businessFeature.tenantId],
    references: [tenant.id],
  }),
}));
