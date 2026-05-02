import { getDb } from "../db";
import { subscriptions, subscriptionRequests } from "../../drizzle/schema_subscriptions";
import { eq, and, gte, lte } from "drizzle-orm";
import bot from "../telegram/bot-handler";
import {
  notifyUserExpiryWarning,
  notifyUserApproved,
  notifyUserRejected,
} from "../telegram/bot-handler";

/**
 * Background job: Send expiry warnings for subscriptions expiring in 3 days
 * Should be run daily via cron job or scheduler
 */
export async function sendExpiryWarnings(): Promise<void> {
  try {
    console.log("[Job] Starting expiry warning notifications...");

    const db = await getDb();
    if (!db) {
      console.error("[Job] Database not available");
      return;
    }

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get subscriptions expiring in 3 days that haven't been notified
    const expiring = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active" as any),
          gte(subscriptions.endDate, now),
          lte(subscriptions.endDate, threeDaysLater)
        )
      );

    console.log(`[Job] Found ${expiring.length} subscriptions expiring soon`);

    for (const sub of expiring) {
      // Skip if already notified
      if (sub.notificationSentAt) {
        continue;
      }

      try {
        // Get the subscription request to find telegram ID
        const request = await db
          .select()
          .from(subscriptionRequests)
          .where(eq(subscriptionRequests.id, sub.requestId))
          .limit(1);

        if (request.length === 0) {
          console.warn(`[Job] Request not found for subscription ${sub.id}`);
          continue;
        }

        const req = request[0];
        const telegramId = req.telegramId || req.userId;
        const daysRemaining = Math.ceil(
          (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send warning
        await notifyUserExpiryWarning(telegramId, daysRemaining, "");

        // Mark as notified
        await db
          .update(subscriptions)
          .set({
            notificationSentAt: now,
          })
          .where(eq(subscriptions.id, sub.id));

        console.log(`[Job] Sent expiry warning to ${telegramId} (${daysRemaining} days remaining)`);
      } catch (error) {
        console.error(`[Job] Error processing subscription ${sub.id}:`, error);
      }
    }

    console.log("[Job] Expiry warning notifications completed");
  } catch (error) {
    console.error("[Job] Error in sendExpiryWarnings:", error);
  }
}

/**
 * Background job: Mark expired subscriptions
 * Should be run daily via cron job or scheduler
 */
export async function markExpiredSubscriptions(): Promise<void> {
  try {
    console.log("[Job] Starting mark expired subscriptions...");

    const db = await getDb();
    if (!db) {
      console.error("[Job] Database not available");
      return;
    }

    const now = new Date();

    // Get active subscriptions that have passed their end date
    const expired = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active" as any),
          lte(subscriptions.endDate, now)
        )
      );

    console.log(`[Job] Found ${expired.length} subscriptions to mark as expired`);

    for (const sub of expired) {
      try {
        // Update subscription status
        await db
          .update(subscriptions)
          .set({
            status: "expired" as any,
          })
          .where(eq(subscriptions.id, sub.id));

        // Get the subscription request to find telegram ID for notification
        const request = await db
          .select()
          .from(subscriptionRequests)
          .where(eq(subscriptionRequests.id, sub.requestId))
          .limit(1);

        if (request.length > 0) {
          const req = request[0];
          const telegramId = req.telegramId || req.userId;

          // Send expiration notification
          try {
            await bot.sendMessage(
              telegramId,
              `⏰ *Subscription Expired*\n\nYour subscription has expired. Renew now to continue enjoying premium features!\n\n/subscribe`,
              {
                parse_mode: "Markdown",
              }
            );
          } catch (error) {
            console.error(`[Job] Failed to notify ${telegramId}:`, error);
          }
        }

        console.log(`[Job] Marked subscription ${sub.id} as expired`);
      } catch (error) {
        console.error(`[Job] Error marking subscription ${sub.id} as expired:`, error);
      }
    }

    console.log("[Job] Mark expired subscriptions completed");
  } catch (error) {
    console.error("[Job] Error in markExpiredSubscriptions:", error);
  }
}

/**
 * Background job: Process pending subscription requests
 * Check if admin has approved/rejected requests and notify users
 */
export async function processPendingRequests(): Promise<void> {
  try {
    console.log("[Job] Starting process pending requests...");

    const db = await getDb();
    if (!db) {
      console.error("[Job] Database not available");
      return;
    }

    // Get all pending requests that have been updated (approved or rejected)
    const pending = await db
      .select()
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.status, "pending" as any));

    console.log(`[Job] Found ${pending.length} pending requests to check`);

    for (const req of pending) {
      // Check if there's a corresponding subscription (means it was approved)
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.requestId, req.id))
        .limit(1);

      if (subscription.length > 0) {
        // Already processed
        continue;
      }

      // Check if it was rejected
      if (req.status === "rejected") {
        const telegramId = req.telegramId || req.userId;
        try {
          await notifyUserRejected(telegramId, req.rejectionReason || "No reason provided");
          console.log(`[Job] Notified user ${telegramId} of rejection`);
        } catch (error) {
          console.error(`[Job] Failed to notify ${telegramId}:`, error);
        }
      }
    }

    console.log("[Job] Process pending requests completed");
  } catch (error) {
    console.error("[Job] Error in processPendingRequests:", error);
  }
}

/**
 * Run all subscription notification jobs
 */
export async function runAllSubscriptionJobs(): Promise<void> {
  console.log("[Job] Running all subscription notification jobs...");

  try {
    await sendExpiryWarnings();
    await markExpiredSubscriptions();
    await processPendingRequests();

    console.log("[Job] All subscription notification jobs completed successfully");
  } catch (error) {
    console.error("[Job] Error running subscription jobs:", error);
  }
}

/**
 * Schedule subscription notification jobs
 * Call this function during server startup to register cron jobs
 */
export function scheduleSubscriptionJobs(): void {
  // Run jobs daily at 2 AM
  const schedule = require("node-schedule");

  try {
    // Daily at 2:00 AM
    schedule.scheduleJob("0 2 * * *", () => {
      console.log("[Scheduler] Running daily subscription jobs...");
      runAllSubscriptionJobs().catch((error) => {
        console.error("[Scheduler] Error running subscription jobs:", error);
      });
    });

    console.log("[Scheduler] Subscription notification jobs scheduled for daily execution at 2:00 AM");
  } catch (error) {
    console.error("[Scheduler] Error scheduling subscription jobs:", error);
  }
}
