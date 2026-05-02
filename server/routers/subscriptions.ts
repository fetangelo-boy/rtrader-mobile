import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { subscriptionPlans, subscriptionRequests, subscriptions, paymentDetails } from "../../drizzle/schema_subscriptions";
import { eq, desc, and, gte, lte } from "drizzle-orm";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

export const subscriptionsRouter = router({
  /**
   * Get all available subscription plans
   */
  getPlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.durationDays);
    return plans;
  }),

  /**
   * Get current payment details (T-Bank)
   */
  getPaymentDetails: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const details = await db
      .select()
      .from(paymentDetails)
      .where(eq(paymentDetails.isActive, 1))
      .limit(1);
    
    if (details.length === 0) {
      return null;
    }

    const detail = details[0];
    return {
      id: detail.id,
      bank: detail.bank,
      cardNumber: detail.cardNumber,
      cardExpiry: detail.cardExpiry,
      recipientName: detail.recipientName,
    };
  }),

  /**
   * Create a subscription request (user applies for subscription)
   */
  createRequest: protectedProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        telegramId: z.string().optional(),
        firstName: z.string().optional(),
        receiptUrl: z.string().optional(), // S3 URL to receipt image
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const requestId = uuidv4();

      // Get the plan to validate it exists
      const plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, input.planId))
        .limit(1);

      if (plan.length === 0) {
        throw new Error("Plan not found");
      }

      // Create the subscription request
      const values: any = {
        id: requestId,
        userId: String(ctx.user.id),
        planId: input.planId,
        email: ctx.user.email,
        status: "pending",
      };
      if (input.telegramId) values.telegramId = input.telegramId;
      if (input.firstName) values.firstName = input.firstName;
      if (input.receiptUrl) values.receiptUrl = input.receiptUrl;
      
      const result = await db.insert(subscriptionRequests).values(values);

      return {
        id: requestId,
        status: "pending",
        message: "Subscription request created. Please upload receipt and wait for admin approval.",
      };
    }),

  /**
   * Get user's subscription requests
   */
  getRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const requests = await db
      .select()
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.userId, String(ctx.user.id)))
      .orderBy(desc(subscriptionRequests.createdAt));

    return requests;
  }),

  /**
   * Get user's active subscription
   */
  getActiveSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const now = new Date();
    const active = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, String(ctx.user.id)),
          eq(subscriptions.status, "active" as any),
          gte(subscriptions.endDate, now)
        )
      )
      .limit(1);

    if (active.length === 0) {
      return null;
    }

    const subscription = active[0];
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.planId))
      .limit(1);

    return {
      id: subscription.id,
      planId: subscription.planId,
      planName: plan[0]?.name,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      daysRemaining: Math.ceil((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }),

  /**
   * Get subscription history
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const history = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, String(ctx.user.id)))
      .orderBy(desc(subscriptions.endDate));

    return history;
  }),

  /**
   * Check if user has active subscription
   */
  hasActiveSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const now = new Date();
    const active = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, String(ctx.user.id)),
          eq(subscriptions.status, "active" as any),
          gte(subscriptions.endDate, now)
        )
      )
      .limit(1);

    return active.length > 0;
  }),

  /**
   * Admin: Get all pending requests
   */
  getPendingRequests: publicProcedure.query(async () => {
    // TODO: Add admin role check
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const pending = await db
      .select()
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.status, "pending" as any))
      .orderBy(subscriptionRequests.createdAt);

    return pending;
  }),

  /**
   * Admin: Approve subscription request
   */
  approveRequest: publicProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        adminId: z.string(), // Telegram admin ID
        durationDays: z.number().int().positive().optional(), // Override plan duration if needed
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Add admin authentication check
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get the request
      const request = await db
        .select()
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.id, input.requestId))
        .limit(1);

      if (request.length === 0) {
        throw new Error("Request not found");
      }

      const req = request[0];

      // Get the plan
      const plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, req.planId))
        .limit(1);

      if (plan.length === 0) {
        throw new Error("Plan not found");
      }

      const p = plan[0];
      const durationDays = input.durationDays || p.durationDays;
      const now = new Date();
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const subscriptionId = uuidv4();

      // Update request status
      await db
        .update(subscriptionRequests)
        .set({
          status: "approved" as any,
          approvedAt: now,
          approvedByAdmin: input.adminId,
        })
        .where(eq(subscriptionRequests.id, input.requestId));

      // Create active subscription
      await db.insert(subscriptions).values({
        id: subscriptionId,
        userId: req.userId,
        requestId: input.requestId,
        planId: req.planId,
        endDate: endDate,
        status: "active" as any,
      });

      return {
        id: subscriptionId,
        status: "approved",
        endDate: endDate,
        message: `Subscription approved. Valid until ${endDate.toLocaleDateString()}`,
      };
    }),

  /**
   * Admin: Reject subscription request
   */
  rejectRequest: publicProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        adminId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Add admin authentication check
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      await db
        .update(subscriptionRequests)
        .set({
          status: "rejected" as any,
          rejectedAt: now,
          rejectionReason: input.reason,
          approvedByAdmin: input.adminId,
        })
        .where(eq(subscriptionRequests.id, input.requestId));

      return {
        status: "rejected",
        message: `Request rejected. Reason: ${input.reason}`,
      };
    }),

  /**
   * Update subscription status to expired
   */
  expireSubscription: publicProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // TODO: Add admin or system authentication
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      await db
        .update(subscriptions)
        .set({
          status: "expired" as any,
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { status: "expired" };
    }),

  /**
   * Mark 3-day warning as sent
   */
  markWarningAsSent: publicProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // TODO: Add system authentication
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      await db
        .update(subscriptions)
        .set({
          notificationSentAt: now,
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { sent: true };
    }),

  /**
   * Get subscriptions expiring soon (for background job)
   */
  getExpiringSubscriptions: publicProcedure
    .input(
      z.object({
        daysUntilExpiry: z.number().int().positive().default(3),
      })
    )
    .query(async ({ input }) => {
      // TODO: Add system authentication
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      const expiryDate = new Date(now.getTime() + input.daysUntilExpiry * 24 * 60 * 60 * 1000);

      const expiring = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "active" as any),
            lte(subscriptions.endDate, expiryDate),
            gte(subscriptions.endDate, now)
          )
        );

      return expiring;
    }),
});
