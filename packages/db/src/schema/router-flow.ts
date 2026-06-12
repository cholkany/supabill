import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export const routerSetupStatusEnum = pgEnum("router_setup_status", [
  "provision_script_generated",
  "provision_fetched",
  "reachable",
  "completed",
  "failed",
]);

export const managedRouterStatusEnum = pgEnum("managed_router_status", [
  "pending",
  "bootstrap_generated",
  "connecting",
  "connected",
  "syncing",
  "ready",
  "error",
]);
export const managedRouterLogLevelEnum = pgEnum("managed_router_log_level", ["info", "warning", "error"]);

export const managedRouterSetup = pgTable(
  "managed_router_setup",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

      // ── Router details ────────────────────────────────────────────────────
    routerName: text("router_name").notNull(),
    location: text("location").notNull(),
    status: routerSetupStatusEnum("status").default("provision_script_generated").notNull(),

    // ── Provisioning details ──────────────────────────────────────────────
    step: integer("step").default(2).notNull(),
    provisionToken: text("provision_token").notNull().unique(),
    provisionUrl: text("provision_url").notNull(),
    provisionScript: text("provision_script").notNull(),
    apiUsername: text("api_username").notNull(),
    apiPasswordEncrypted: text("api_password_encrypted").notNull(),
    detectedHost: text("detected_host"),
    apiPort: integer("api_port").default(8728).notNull(),
    provisionFetchedAt: timestamp("provision_fetched_at"),
    reachableAt: timestamp("reachable_at"),
    allPorts: jsonb("all_ports").$type<string[]>().default([]).notNull(),
    hotspotCandidatePorts: jsonb("hotspot_candidate_ports").$type<string[]>().default([]).notNull(),
    selectedHotspotPorts: jsonb("selected_hotspot_ports").$type<string[]>().default([]).notNull(),
    setupLogs: jsonb("setup_logs").$type<string[]>().default([]).notNull(),
    completedRouterId: text("completed_router_id"),
    // ── Heartbeat details ──────────────────────────────────────────────────
    lastHeartbeatAt: timestamp("last_heartbeat_at"),
    cpuLoadPercent: integer("cpu_load_percent"),
    memoryUsagePercent: integer("memory_usage_percent"),
    routerOsVersion: text("router_os_version"),
    // ── Timestamps ──────────────────────────────────────────────────────────
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("managed_router_setup_user_idx").on(table.userId),
    index("managed_router_setup_token_idx").on(table.provisionToken),
  ],
);

export const managedRouter = pgTable(
  "managed_router",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    setupId: text("setup_id").references(() => managedRouterSetup.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    location: text("location").notNull(),
    host: text("host").notNull(),
    apiPort: integer("api_port").default(8728).notNull(),
    apiUsername: text("api_username").notNull(),
    apiPasswordEncrypted: text("api_password_encrypted").notNull(),
    status: managedRouterStatusEnum("status").default("pending").notNull(),
    wanPort: text("wan_port").default("ether1").notNull(),
    hotspotPorts: jsonb("hotspot_ports").$type<string[]>().default([]).notNull(),
    alertingEnabled: boolean("alerting_enabled").default(true).notNull(),
    timezone: text("timezone").default("Africa/Juba").notNull(),
    dnsServers: jsonb("dns_servers").$type<string[]>().default(["1.1.1.1", "8.8.8.8"]).notNull(),
    ntpServers: jsonb("ntp_servers").$type<string[]>().default(["pool.ntp.org"]).notNull(),
    
    // Onboarding / Zero-Touch / Heartbeat
    claimCode: text("claim_code").unique(),
    lastHeartbeatAt: timestamp("last_heartbeat_at"),
    tunnelIp: text("tunnel_ip"),
    cpuLoadPercent: integer("cpu_load_percent"),
    memoryUsagePercent: integer("memory_usage_percent"),
    serialNumber: text("serial_number"),
    architecture: text("architecture"),
    routerIdentity: text("router_identity"),
    routerOsVersion: text("router_os_version"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    lastProbeAt: timestamp("last_probe_at"),
    lastError: text("last_error"),
  },
  (table) => [
    index("managed_router_user_idx").on(table.userId),
    index("managed_router_setup_idx").on(table.setupId),
  ],
);

export const managedRouterLog = pgTable(
  "managed_router_log",
  {
    id: text("id").primaryKey(),
    routerId: text("router_id")
      .notNull()
      .references(() => managedRouter.id, { onDelete: "cascade" }),
    level: managedRouterLogLevelEnum("level").default("info").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("managed_router_log_router_idx").on(table.routerId)],
);

export const managedRouterSetupRelations = relations(managedRouterSetup, ({ one, many }) => ({
  user: one(user, {
    fields: [managedRouterSetup.userId],
    references: [user.id],
  }),
  completedRouter: one(managedRouter, {
    fields: [managedRouterSetup.completedRouterId],
    references: [managedRouter.id],
  }),
  routers: many(managedRouter),
}));

export const managedRouterRelations = relations(managedRouter, ({ one, many }) => ({
  user: one(user, {
    fields: [managedRouter.userId],
    references: [user.id],
  }),
  setup: one(managedRouterSetup, {
    fields: [managedRouter.setupId],
    references: [managedRouterSetup.id],
  }),
  logs: many(managedRouterLog),
}));

export const managedRouterLogRelations = relations(managedRouterLog, ({ one }) => ({
  router: one(managedRouter, {
    fields: [managedRouterLog.routerId],
    references: [managedRouter.id],
  }),
}));
