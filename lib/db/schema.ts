import {
  pgTable,
  serial,
  text,
  integer,
  decimal,
  timestamp,
  date,
  uniqueIndex,
  pgEnum,
  bigint,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const taskStatusEnum = pgEnum("task_status", [
  "not_started",
  "in_progress",
  "needs_info",
  "review",
  "complete",
]);

export const taskCategoryEnum = pgEnum("task_category", [
  "accounting",
  "tax",
]);

export const entityTypeEnum = pgEnum("entity_type", [
  "LLC",
  "S-Corp",
  "C-Corp",
  "Sole Proprietorship",
  "Partnership",
  "Other",
]);

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  entityType: entityTypeEnum("entity_type"),
  einLast4: text("ein_last4"),
  deadline: date("deadline"),
  notes: text("notes"),
  missingItems: text("missing_items"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  category: taskCategoryEnum("category").notNull(),
  taskName: text("task_name").notNull(),
  status: taskStatusEnum("status").notNull().default("not_started"),
  taskOrder: integer("task_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const billing = pgTable("billing", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  monthlyAccountingFee: decimal("monthly_accounting_fee", {
    precision: 10,
    scale: 2,
  }).default("0"),
  monthsBilled: integer("months_billed").default(1),
  taxPrepFee: decimal("tax_prep_fee", { precision: 10, scale: 2 }).default(
    "0"
  ),
  num1099NecForms: integer("num_1099_nec_forms").default(0),
  amountReceived: decimal("amount_received", {
    precision: 10,
    scale: 2,
  }).default("0"),
  billingNotes: text("billing_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const clientsRelations = relations(clients, ({ many, one }) => ({
  tasks: many(tasks),
  billing: one(billing),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
}));

export const billingRelations = relations(billing, ({ one }) => ({
  client: one(clients, {
    fields: [billing.clientId],
    references: [clients.id],
  }),
}));

// QuickBooks OAuth tokens (persisted in DB for serverless)
export const qbTokens = pgTable("qb_tokens", {
  id: serial("id").primaryKey(),
  realmId: text("realm_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks cached API responses
export const qbCache = pgTable(
  "qb_cache",
  {
    id: serial("id").primaryKey(),
    realmId: text("realm_id").notNull(),
    dataKey: text("data_key").notNull(),
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.realmId, t.dataKey)]
);

export type QbToken = typeof qbTokens.$inferSelect;
export type QbCache = typeof qbCache.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Billing = typeof billing.$inferSelect;
export type NewBilling = typeof billing.$inferInsert;
export type TaskStatus = "not_started" | "in_progress" | "needs_info" | "review" | "complete";
export type TaskCategory = "accounting" | "tax";
