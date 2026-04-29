import { mysqlTable, varchar, timestamp, text, int } from 'drizzle-orm/mysql-core';

export const authUsers = mysqlTable('auth_users', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID from Supabase
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
  isActive: int('is_active').default(1).notNull(),
});

export type AuthUser = typeof authUsers.$inferSelect;
export type NewAuthUser = typeof authUsers.$inferInsert;
