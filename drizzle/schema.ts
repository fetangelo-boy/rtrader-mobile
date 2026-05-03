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

/**
 * Push notification tokens — stores Expo push tokens for each user.
 * Used to send push notifications to users' devices.
 */
export const pushTokens = mysqlTable("push_tokens", {
  id: int("id").autoincrement().primaryKey(),

  /** User ID (UUID, references auth_users.id) */
  userId: varchar("userId", { length: 36 }).notNull(),

  /** Expo push token */
  token: text("token").notNull().unique(),

  /** Platform: android, ios, or web */
  platform: mysqlEnum("platform", ["android", "ios", "web"]).notNull(),

  /** Whether token is active (user hasn't unregistered) */
  isActive: int("isActive").default(1).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

// Add foreign key constraint if needed:
// ALTER TABLE push_tokens ADD CONSTRAINT fk_push_tokens_user_id FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

/**
 * Chats — conversation channels (interactive or info_only)
 */
export const chats = mysqlTable("chats", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  chatType: mysqlEnum("chatType", ["interactive", "info_only"]).default("interactive").notNull(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;

/**
 * Messages — chat messages with optional media
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  content: text("content").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaType: mysqlEnum("mediaType", ["image", "video", "file"]),
  replyToId: int("replyToId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Chat participants — user roles and mute status in chats
 */
export const chatParticipants = mysqlTable("chat_participants", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  role: mysqlEnum("role", ["admin", "participant", "subscriber"]).default("subscriber").notNull(),
  isMuted: int("isMuted").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatParticipant = typeof chatParticipants.$inferInsert;

/**
 * Subscriptions — user subscription plans and status
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull().unique(),
  plan: mysqlEnum("plan", ["free", "basic", "premium", "vip"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "canceled", "trialing", "expired"]).default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * One-time login tokens — short-lived tokens for Telegram deep-link auto-login.
 * Generated after /approve, sent to user as deep link, exchanged once for a session.
 */
export const oneTimeLoginTokens = mysqlTable("one_time_login_tokens", {
  id: int("id").autoincrement().primaryKey(),

  /** The one-time token (random hex string) */
  token: varchar("token", { length: 128 }).notNull().unique(),

  /** Supabase user ID this token belongs to */
  supabaseUserId: varchar("supabaseUserId", { length: 64 }).notNull(),

  /** Telegram ID of the user (for logging/debugging) */
  telegramId: varchar("telegramId", { length: 64 }),

  /** When this token expires (15 minutes from creation) */
  expiresAt: timestamp("expiresAt").notNull(),

  /** Whether this token has already been used */
  usedAt: timestamp("usedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OneTimeLoginToken = typeof oneTimeLoginTokens.$inferSelect;
export type InsertOneTimeLoginToken = typeof oneTimeLoginTokens.$inferInsert;
