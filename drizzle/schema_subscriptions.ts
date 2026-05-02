import { mysqlTable, varchar, timestamp, text, int, decimal, mysqlEnum } from 'drizzle-orm/mysql-core';

/**
 * Subscription plans/tariffs
 */
export const subscriptionPlans = mysqlTable('subscription_plans', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  name: varchar('name', { length: 100 }).notNull(), // "Неделя", "Месяц", "3 месяца", "Полгода"
  durationDays: int('duration_days').notNull(), // 7, 30, 90, 180
  priceRub: decimal('price_rub', { precision: 10, scale: 2 }).notNull(), // 1700, 4000, 10300, 20000
  discountPercent: int('discount_percent').default(0).notNull(), // 0, 14, 17
  monthlyPriceRub: decimal('monthly_price_rub', { precision: 10, scale: 2 }).notNull(), // calculated
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Subscription requests (user applies for subscription)
 */
export const subscriptionRequests = mysqlTable('subscription_requests', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  userId: varchar('user_id', { length: 36 }).notNull(), // FK to authUsers
  planId: varchar('plan_id', { length: 36 }).notNull(), // FK to subscriptionPlans
  telegramId: varchar('telegram_id', { length: 50 }), // Telegram user ID
  firstName: varchar('first_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending').notNull(),
  receiptUrl: text('receipt_url'), // S3 URL to uploaded receipt
  approvedAt: timestamp('approved_at'),
  approvedByAdmin: varchar('approved_by_admin', { length: 255 }), // Admin telegram ID or name
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Active subscriptions
 */
export const subscriptions = mysqlTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  userId: varchar('user_id', { length: 36 }).notNull(), // FK to authUsers
  requestId: varchar('request_id', { length: 36 }).notNull(), // FK to subscriptionRequests
  planId: varchar('plan_id', { length: 36 }).notNull(), // FK to subscriptionPlans
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date').notNull(), // Set by admin when approving
  status: mysqlEnum('status', ['active', 'expired', 'cancelled']).default('active').notNull(),
  notificationSentAt: timestamp('notification_sent_at'), // When 3-day warning was sent
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Payment details (stored for reference)
 */
export const paymentDetails = mysqlTable('payment_details', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  bank: varchar('bank', { length: 100 }).notNull(), // "Т-Банк"
  cardNumber: varchar('card_number', { length: 20 }).notNull(), // "5536 9138 8189 0954"
  cardExpiry: varchar('card_expiry', { length: 10 }).notNull(), // "09/28"
  recipientName: varchar('recipient_name', { length: 255 }).notNull(), // "Зерянский Роман Олегович"
  isActive: int('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

export type SubscriptionRequest = typeof subscriptionRequests.$inferSelect;
export type NewSubscriptionRequest = typeof subscriptionRequests.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type PaymentDetail = typeof paymentDetails.$inferSelect;
export type NewPaymentDetail = typeof paymentDetails.$inferInsert;
