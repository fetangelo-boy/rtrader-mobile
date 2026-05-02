import { getDb } from "../db";
import { subscriptions } from "../../drizzle/schema_subscriptions";
import { eq, and, gte } from "drizzle-orm";

/**
 * Check if a user has an active subscription
 */
export async function checkUserSubscription(userId: string): Promise<{
  hasActive: boolean;
  subscription: any | null;
  daysRemaining: number;
  message: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        hasActive: false,
        subscription: null,
        daysRemaining: 0,
        message: "Database not available",
      };
    }

    const now = new Date();
    const active = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active" as any),
          gte(subscriptions.endDate, now)
        )
      )
      .limit(1);

    if (active.length === 0) {
      return {
        hasActive: false,
        subscription: null,
        daysRemaining: 0,
        message: "No active subscription found",
      };
    }

    const sub = active[0];
    const daysRemaining = Math.ceil(
      (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      hasActive: true,
      subscription: sub,
      daysRemaining,
      message: `Active subscription valid for ${daysRemaining} more days`,
    };
  } catch (error) {
    console.error("Subscription check error:", error);
    return {
      hasActive: false,
      subscription: null,
      daysRemaining: 0,
      message: "Error checking subscription",
    };
  }
}

/**
 * Verify subscription and throw error if not active
 */
export async function requireSubscription(userId: string): Promise<any> {
  const check = await checkUserSubscription(userId);

  if (!check.hasActive) {
    throw new Error("Active subscription required. Please purchase a subscription to access this feature.");
  }

  return check.subscription;
}

/**
 * Get subscription status for display
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  status: "active" | "expired" | "none";
  expiresAt: Date | null;
  daysRemaining: number;
  planName: string | null;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        status: "none",
        expiresAt: null,
        daysRemaining: 0,
        planName: null,
      };
    }

    const now = new Date();

    // Get the most recent subscription
    const recent = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(subscriptions.endDate)
      .limit(1);

    if (recent.length === 0) {
      return {
        status: "none",
        expiresAt: null,
        daysRemaining: 0,
        planName: null,
      };
    }

    const sub = recent[0];

    if (sub.status === "expired" || sub.endDate <= now) {
      return {
        status: "expired",
        expiresAt: sub.endDate,
        daysRemaining: 0,
        planName: sub.planId,
      };
    }

    if (sub.status === "active" && sub.endDate > now) {
      const daysRemaining = Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        status: "active",
        expiresAt: sub.endDate,
        daysRemaining,
        planName: sub.planId,
      };
    }

    return {
      status: "none",
      expiresAt: null,
      daysRemaining: 0,
      planName: null,
    };
  } catch (error) {
    console.error("Subscription status error:", error);
    return {
      status: "none",
      expiresAt: null,
      daysRemaining: 0,
      planName: null,
    };
  }
}

/**
 * Check if subscription is expiring soon (for warnings)
 */
export async function isExpiringsoon(userId: string, daysThreshold: number = 3): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const expiring = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active" as any),
          gte(subscriptions.endDate, now)
        )
      )
      .limit(1);

    if (expiring.length === 0) return false;

    const sub = expiring[0];
    return sub.endDate <= thresholdDate && sub.endDate > now;
  } catch (error) {
    console.error("Expiring soon check error:", error);
    return false;
  }
}

/**
 * Get all users with expiring subscriptions
 */
export async function getUsersWithExpiringSubscriptions(
  daysThreshold: number = 3
): Promise<Array<{ userId: string; daysRemaining: number; email: string }>> {
  try {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const expiring = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active" as any),
          gte(subscriptions.endDate, now)
        )
      );

    return expiring
      .filter((sub) => sub.endDate <= thresholdDate && sub.endDate > now && !sub.notificationSentAt)
      .map((sub) => ({
        userId: sub.userId,
        daysRemaining: Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        email: "", // Will be populated by caller if needed
      }));
  } catch (error) {
    console.error("Get expiring users error:", error);
    return [];
  }
}
