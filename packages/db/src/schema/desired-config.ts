import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { managedRouter } from "./router-flow.js";

export const routerDesiredConfig = pgTable("router_desired_config", {
  id: text("id").primaryKey(),
  routerId: text("router_id")
    .notNull()
    .unique()
    .references(() => managedRouter.id, { onDelete: "cascade" }),
  config: jsonb("config").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const routerDesiredConfigRelations = relations(routerDesiredConfig, ({ one }) => ({
  router: one(managedRouter, {
    fields: [routerDesiredConfig.routerId],
    references: [managedRouter.id],
  }),
}));
