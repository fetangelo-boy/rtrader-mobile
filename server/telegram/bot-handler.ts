import { getDb } from "../db";
import { subscriptionPlans, subscriptionRequests, paymentDetails } from "../../drizzle/schema_subscriptions";
import { eq } from "drizzle-orm";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

// @ts-ignore
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS = process.env.ADMIN_IDS?.split(",") || ["rhodes4ever"];

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN not configured");
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return `₽${price.toLocaleString("ru-RU")}`;
}

/**
 * Send tariff selection menu to user
 */
export async function sendTariffMenu(chatId: number | string, userId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all subscription plans
    const plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.durationDays);

    if (plans.length === 0) {
      await bot.sendMessage(chatId, "❌ No subscription plans available at the moment.");
      return;
    }

    // Create inline keyboard with plan options
    const keyboard = plans.map((plan) => [
      {
        text: `${plan.name} - ${formatPrice(Number(plan.priceRub))}`,
        callback_data: `tariff_${plan.id}`,
      },
    ]);

    // Add cancel button
    keyboard.push([{ text: "❌ Cancel", callback_data: "cancel" }]);

    await bot.sendMessage(
      chatId,
      `📊 *Available Subscription Plans*\n\nChoose a plan to get started:\n\n${plans
        .map((p) => `• *${p.name}* - ${formatPrice(Number(p.priceRub))}\n  Duration: ${p.durationDays} days`)
        .join("\n\n")}`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: keyboard,
        },
      }
    );
  } catch (error) {
    console.error("Error sending tariff menu:", error);
    await bot.sendMessage(chatId, "❌ Error loading subscription plans. Please try again later.");
  }
}

/**
 * Send payment instructions for selected plan
 */
export async function sendPaymentInstructions(
  chatId: number | string,
  planId: string,
  userId: string,
  telegramName: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get plan details
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (plan.length === 0) {
      await bot.sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const selectedPlan = plan[0];

    // Get payment details
    const paymentInfo = await db
      .select()
      .from(paymentDetails)
      .where(eq(paymentDetails.isActive, 1))
      .limit(1);

    if (paymentInfo.length === 0) {
      await bot.sendMessage(chatId, "❌ Payment details not configured.");
      return;
    }

    const payment = paymentInfo[0];

    // Create subscription request
    const requestId = uuidv4();
    await db.insert(subscriptionRequests).values({
      id: requestId,
      userId: userId,
      planId: planId,
      telegramId: String(chatId),
      firstName: telegramName,
      email: `tg${chatId}@rtrader.app`,
      status: "pending" as any,
    });

    // Send payment instructions
    const paymentMessage = `
💳 *Payment Instructions*

Plan: *${selectedPlan.name}*
Price: *${formatPrice(Number(selectedPlan.priceRub))}*
Duration: *${selectedPlan.durationDays} days*

📍 *Payment Details:*
Bank: ${payment.bank}
Card: \`${payment.cardNumber}\`
Expiry: ${payment.cardExpiry}
Recipient: ${payment.recipientName}

✅ *Steps:*
1. Transfer ${formatPrice(Number(selectedPlan.priceRub))} to the card above
2. Take a screenshot of the payment confirmation
3. Send the screenshot to this chat
4. Our admin will verify and activate your subscription

⏱️ *Processing time:* Usually within 1-2 hours

Request ID: \`${requestId}\`
    `;

    await bot.sendMessage(chatId, paymentMessage, {
      parse_mode: "Markdown",
    });

    // Send keyboard for next steps
    await bot.sendMessage(chatId, "What would you like to do?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📤 Upload Receipt", callback_data: `upload_${requestId}` }],
          [{ text: "🔄 Choose Another Plan", callback_data: "show_plans" }],
          [{ text: "❌ Cancel", callback_data: "cancel" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error sending payment instructions:", error);
    await bot.sendMessage(chatId, "❌ Error processing your request. Please try again later.");
  }
}

/**
 * Send subscription status to user
 */
export async function sendSubscriptionStatus(
  chatId: number | string,
  userId: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get user's subscription requests
    const requests = await db
      .select()
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.userId, userId));

    if (requests.length === 0) {
      await bot.sendMessage(
        chatId,
        "📋 *No subscription requests found*\n\nUse /subscribe to purchase a subscription.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Subscribe Now", callback_data: "show_plans" }],
            ],
          },
        }
      );
      return;
    }

    // Show latest request status
    const latestRequest = requests[requests.length - 1];
    let statusEmoji = "⏳";
    let statusText = "Pending";

    if (latestRequest.status === "approved") {
      statusEmoji = "✅";
      statusText = "Approved";
    } else if (latestRequest.status === "rejected") {
      statusEmoji = "❌";
      statusText = `Rejected: ${latestRequest.rejectionReason || "No reason provided"}`;
    }

    const statusMessage = `
${statusEmoji} *Subscription Status*

Status: *${statusText}*
Created: ${latestRequest.createdAt.toLocaleDateString()}
    `;

    await bot.sendMessage(chatId, statusMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Subscribe Now", callback_data: "show_plans" }],
          [{ text: "📞 Contact Support", callback_data: "contact_support" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error sending subscription status:", error);
    await bot.sendMessage(chatId, "❌ Error retrieving subscription status. Please try again later.");
  }
}

/**
 * Send admin notification about new subscription request
 */
export async function notifyAdminNewRequest(
  requestId: string,
  telegramId: string,
  planName: string,
  price: number
): Promise<void> {
  try {
    const adminMessage = `
🔔 *New Subscription Request*

Request ID: \`${requestId}\`
Telegram ID: ${telegramId}
Plan: *${planName}*
Price: *${formatPrice(price)}*
Time: ${new Date().toLocaleString()}

/approve_${requestId} | /reject_${requestId}
    `;

    // Send to all admins
    for (const adminId of ADMIN_IDS) {
      try {
        await bot.sendMessage(adminId, adminMessage, {
          parse_mode: "Markdown",
        });
      } catch (error) {
        console.error(`Failed to notify admin ${adminId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error notifying admin:", error);
  }
}

/**
 * Send approval notification to user
 */
export async function notifyUserApproved(
  chatId: number | string,
  planName: string,
  expiresAt: Date
): Promise<void> {
  try {
    const message = `
✅ *Subscription Approved!*

Plan: *${planName}*
Expires: *${expiresAt.toLocaleDateString()}*

You can now access all premium features in the RTrader app!

🚀 Open the app to get started.
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error notifying user approval:", error);
  }
}

/**
 * Send rejection notification to user
 */
export async function notifyUserRejected(
  chatId: number | string,
  reason: string
): Promise<void> {
  try {
    const message = `
❌ *Subscription Request Rejected*

Reason: ${reason}

Please contact support for more information or try again with a different payment method.

📞 Support: @rtrader_support
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error notifying user rejection:", error);
  }
}

/**
 * Send expiry warning to user
 */
export async function notifyUserExpiryWarning(
  chatId: number | string,
  daysRemaining: number,
  renewalLink: string
): Promise<void> {
  try {
    const message = `
⏰ *Subscription Expiring Soon*

Your subscription expires in *${daysRemaining} days*.

Renew now to continue enjoying premium features!

/subscribe
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Renew Subscription", callback_data: "show_plans" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error notifying user expiry warning:", error);
  }
}

export default bot;
