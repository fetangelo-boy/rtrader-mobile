import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Subscription requests — unified table for both Telegram and Email channels.
 * Each row represents one subscription payment request from a user.
 * Admin reviews, approves/rejects, and the system executes access provisioning.
 */
export const subscriptionRequests = mysqlTable("subscription_requests", {
  id: int("id").autoincrement().primaryKey(),

  /** Channel: 'telegram' or 'email' */
  channel: mysqlEnum("channel", ["telegram", "email"]).notNull(),

  /** Current status of the request */
  status: mysqlEnum("status", [
    "pending_review",
    "approved",
    "rejected",
    "executed",
    "failed",
  ])
    .default("pending_review")
    .notNull(),

  // --- Contact info (one of telegram_id or email is required) ---
  /** Telegram user ID (for telegram channel) */
  telegramId: varchar("telegramId", { length: 64 }),
  /** Telegram display name */
  telegramName: varchar("telegramName", { length: 255 }),
  /** Email address (for email channel) */
  email: varchar("email", { length: 320 }),
  /** Contact name from email form */
  contactName: varchar("contactName", { length: 255 }),

  // --- Receipt ---
  /** URL to the uploaded receipt screenshot in S3 */
  receiptUrl: text("receiptUrl"),
  /** Optional comment from the user */
  receiptText: text("receiptText"),

  // --- Admin decision ---
  /** Admin's note/comment */
  adminNote: text("adminNote"),
  /** Subscription end date set by admin (stored as ISO string for TiDB compat) */
  approvedUntil: timestamp("approvedUntil"),
  /** Subscription plan set by admin */
  approvedPlan: varchar("approvedPlan", { length: 64 }),
  /** Admin identifier */
  approvedBy: varchar("approvedBy", { length: 255 }),

  // --- Execution result ---
  /** Supabase user ID after execution */
  supabaseUserId: varchar("supabaseUserId", { length: 64 }),
  /** Whether a new user was created (true) or existing was renewed (false) */
  isNewUser: int("isNewUser"),
  /** When access was provisioned */
  executedAt: timestamp("executedAt"),
  /** Error message if execution failed */
  errorMessage: text("errorMessage"),

  // --- Timestamps ---
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionRequest = typeof subscriptionRequests.$inferSelect;
export type InsertSubscriptionRequest = typeof subscriptionRequests.$inferInsert;
