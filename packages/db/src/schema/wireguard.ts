import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { managedRouter } from "./router-flow.js";

export const wireguardTunnelStatusEnum = pgEnum("wireguard_tunnel_status", [
  "pending",    // keys generated, not yet pushed to router
  "applied",    // RouterOS commands executed successfully
  "error",      // push failed
]);

export const managedRouterWireguard = pgTable(
  "managed_router_wireguard",
  {
    id: text("id").primaryKey(),
    routerId: text("router_id")
      .notNull()
      .unique()
      .references(() => managedRouter.id, { onDelete: "cascade" }),

    // ── Router side (WireGuard server on the MikroTik) ──────────────
    routerInterfaceName: text("router_interface_name").default("supabill-wg").notNull(),
    routerListenPort: integer("router_listen_port").default(51820).notNull(),
    routerPrivateKeyEncrypted: text("router_private_key_encrypted").notNull(),
    routerPublicKey: text("router_public_key").notNull(),
    routerTunnelIp: text("router_tunnel_ip").notNull(), // e.g. "10.100.0.1/30"

    // ── Peer / client side (Supabill server or NOC device) ──────────
    peerPrivateKeyEncrypted: text("peer_private_key_encrypted").notNull(),
    peerPublicKey: text("peer_public_key").notNull(),
    peerTunnelIp: text("peer_tunnel_ip").notNull(), // e.g. "10.100.0.2/30"

    // ── Endpoint ─────────────────────────────────────────────────────
    // Public host/IP where MikroTik's WireGuard port is reachable.
    // For edge routers this is the WAN IP; for NAT'd routers it may be
    // a DDNS hostname or left empty when initiating from the router side.
    wanHost: text("wan_host"),

    status: wireguardTunnelStatusEnum("status").default("pending").notNull(),
    appliedAt: timestamp("applied_at"),
    lastError: text("last_error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("managed_router_wireguard_router_idx").on(table.routerId)],
);

export const managedRouterWireguardRelations = relations(managedRouterWireguard, ({ one }) => ({
  router: one(managedRouter, {
    fields: [managedRouterWireguard.routerId],
    references: [managedRouter.id],
  }),
}));

export const wireguardHub = pgTable("wireguard_hub", {
  id: text("id").primaryKey(),

  publicKey: text("public_key").notNull(),

  privateKeyEncrypted: text("private_key_encrypted").notNull(),

  endpoint: text("endpoint").notNull(),

  listenPort: integer("listen_port").notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});
