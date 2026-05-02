import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { subscriptionRequests, subscriptions, subscriptionPlans } from "../../drizzle/schema_subscriptions";
import { eq, desc, and, gte, lte } from "drizzle-orm";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

// Admin IDs (Telegram user IDs)
const ADMIN_IDS = process.env.ADMIN_IDS?.split(",") || ["rhodes4ever"];

/**
 * Verify if the user is an admin
 */
function isAdmin(adminId: string): boolean {
  return ADMIN_IDS.includes(adminId);
}

export const adminTrpcRouter = router({
  /**
   * Get all pending subscription requests
   */
  getPendingRequests: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const pending = await db
        .select()
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.status, "pending" as any))
        .orderBy(subscriptionRequests.createdAt);

      return pending;
    }),

  /**
   * Get subscription request details with plan info
   */
  getRequestDetails: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        requestId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const request = await db
        .select()
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.id, input.requestId))
        .limit(1);

      if (request.length === 0) {
        throw new Error("Request not found");
      }

      const req = request[0];

      // Get plan details
      const plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, req.planId))
        .limit(1);

      return {
        request: req,
        plan: plan[0] || null,
      };
    }),

  /**
   * Approve subscription request
   */
  approveRequest: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        requestId: z.string().uuid(),
        durationDays: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        message: `Subscription approved for ${durationDays} days. Valid until ${endDate.toLocaleDateString()}`,
      };
    }),

  /**
   * Reject subscription request
   */
  rejectRequest: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        requestId: z.string().uuid(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
   * Get all approved subscriptions
   */
  getApprovedSubscriptions: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        limit: z.number().int().positive().default(50),
      })
    )
    .query(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const approved = await db
        .select()
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.status, "approved" as any))
        .orderBy(desc(subscriptionRequests.approvedAt))
        .limit(input.limit);

      return approved;
    }),

  /**
   * Get all rejected subscriptions
   */
  getRejectedSubscriptions: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        limit: z.number().int().positive().default(50),
      })
    )
    .query(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rejected = await db
        .select()
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.status, "rejected" as any))
        .orderBy(desc(subscriptionRequests.rejectedAt))
        .limit(input.limit);

      return rejected;
    }),

  /**
   * Get subscription statistics
   */
  getStats: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get counts
      const allRequests = await db.select().from(subscriptionRequests);
      const pendingCount = allRequests.filter((r) => r.status === "pending").length;
      const approvedCount = allRequests.filter((r) => r.status === "approved").length;
      const rejectedCount = allRequests.filter((r) => r.status === "rejected").length;

      // Get active subscriptions
      const now = new Date();
      const allSubscriptions = await db.select().from(subscriptions);
      const activeCount = allSubscriptions.filter(
        (s) => s.status === "active" && s.endDate > now
      ).length;
      const expiredCount = allSubscriptions.filter((s) => s.status === "expired").length;

      return {
        requests: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: allRequests.length,
        },
        subscriptions: {
          active: activeCount,
          expired: expiredCount,
          total: allSubscriptions.length,
        },
      };
    }),

  /**
   * Get expiring subscriptions (for notifications)
   */
  getExpiringSubscriptions: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        daysUntilExpiry: z.number().int().positive().default(3),
      })
    )
    .query(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const expiryDate = new Date(now.getTime() + input.daysUntilExpiry * 24 * 60 * 60 * 1000);

      const expiring = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.status, "active" as any));

      // Filter for subscriptions expiring within the specified days
      const filtered = expiring.filter((s) => {
        return s.endDate <= expiryDate && s.endDate > now && !s.notificationSentAt;
      });

      return filtered;
    }),

  /**
   * Mark expiring subscription notification as sent
   */
  markNotificationSent: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        subscriptionId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      if (!isAdmin(input.adminId)) {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      await db
        .update(subscriptions)
        .set({
          notificationSentAt: now,
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { sent: true };
    }),
});
