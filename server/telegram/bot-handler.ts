import { drizzle } from "drizzle-orm/mysql2";
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

// Create single DB connection
let _db: any = null;
function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

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
    const db = getDb();
    if (!db) {
      await bot.sendMessage(chatId, "❌ Ошибка подключения к БД. Попробуйте позже.");
      return;
    }

    console.log(`[Bot] Getting plans for chat ${chatId}`);
    
    // Get all subscription plans
    const plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.durationDays);

    console.log(`[Bot] Found ${plans.length} plans`);

    if (plans.length === 0) {
      await bot.sendMessage(chatId, "❌ Тарифные планы временно недоступны. Попробуйте позже.");
      return;
    }

    // Create inline keyboard with plan options
    const keyboard = plans.map((plan: any) => [
      {
        text: `${plan.name} - ${formatPrice(Number(plan.priceRub))}`,
        callback_data: `tariff_${plan.id}`,
      },
    ]);

    // Add home and cancel buttons
    keyboard.push([{ text: "🏠 Главное меню", callback_data: "home" }]);
    keyboard.push([{ text: "❌ Отмена", callback_data: "cancel" }]);

    const message = `📊 *Доступные тарифные планы*\n\nВыберите подходящий вам план:\n\n${plans
      .map((p: any) => `• *${p.name}* - ${formatPrice(Number(p.priceRub))}\n  Период: ${p.durationDays} дней`)
      .join("\n\n")}`;

    console.log(`[Bot] Sending tariff menu to ${chatId}`);
    
    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });

    console.log(`[Bot] Tariff menu sent successfully`);
  } catch (error) {
    console.error("Error sending tariff menu:", error);
    try {
      await bot.sendMessage(chatId, "❌ Ошибка при загрузке тарифов. Попробуйте позже.");
    } catch (e) {
      console.error("Failed to send error message:", e);
    }
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
    const db = getDb();
    if (!db) {
      await bot.sendMessage(chatId, "❌ Ошибка подключения к БД.");
      return;
    }

    console.log(`[Bot] Getting plan ${planId}`);

    // Get plan details
    const plan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);

    if (plan.length === 0) {
      await bot.sendMessage(chatId, "❌ Тариф не найден.");
      return;
    }

    const selectedPlan = plan[0];

    // Get payment details
    const paymentInfo = await db.select().from(paymentDetails).limit(1);

    const paymentMessage = `
💳 *Инструкция по оплате*

Вы выбрали тариф: *${selectedPlan.name}*
Стоимость: *${formatPrice(Number(selectedPlan.priceRub))}*

📋 *Реквизиты для оплаты:*
Банк: *${paymentInfo[0]?.bank || "Т-Банк"}*
Номер карты: \`${paymentInfo[0]?.cardNumber || "не указана"}\`
ФИО: *${paymentInfo[0]?.recipientName || "не указано"}*
Срок: ${paymentInfo[0]?.cardExpiry || "не указан"}

📸 *Что дальше:*
1. Переведите деньги по указанным реквизитам
2. Сделайте скриншот платежа
3. Отправьте скриншот в этот чат
4. Администратор проверит платёж и активирует подписку

⏰ Обычно активация занимает 5-10 минут.
    `;

    await bot.sendMessage(chatId, paymentMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📸 Загрузить скриншот", callback_data: "upload_receipt" }],
          [{ text: "🏠 Главное меню", callback_data: "home" }],
          [{ text: "❌ Отмена", callback_data: "cancel" }],
        ],
      },
    });

    // Create subscription request
    const requestId = uuidv4();
    await db.insert(subscriptionRequests).values({
      id: requestId,
      userId: userId,
      planId: planId,
      telegramId: String(chatId),
      firstName: telegramName,
      email: `${chatId}@telegram.local`,
      status: "pending",
    });

    console.log(`[Bot] Subscription request created: ${requestId}`);
  } catch (error) {
    console.error("Error sending payment instructions:", error);
    try {
      await bot.sendMessage(chatId, "❌ Ошибка при обработке запроса. Попробуйте позже.");
    } catch (e) {
      console.error("Failed to send error message:", e);
    }
  }
}

/**
 * Send subscription status to user
 */
export async function sendSubscriptionStatus(chatId: number | string, userId: string): Promise<void> {
  try {
    const db = getDb();
    if (!db) {
      await bot.sendMessage(chatId, "❌ Ошибка подключения к БД.");
      return;
    }

    // Get user's subscription requests
    const requests = await db
      .select()
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.telegramId, String(chatId)))
      .orderBy(subscriptionRequests.createdAt);

    if (requests.length === 0) {
      await bot.sendMessage(
        chatId,
        `📋 *Статус подписки*

У вас нет активных запросов на подписку.

Хотите подписаться? Используйте /subscribe`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Выбрать тариф", callback_data: "show_plans" }],
              [{ text: "📞 Служба поддержки", callback_data: "contact_support" }],
            ],
          },
        }
      );
      return;
    }

    // Show latest request status
    const latestRequest = requests[requests.length - 1];
    let statusEmoji = "⏳";
    let statusText = "На рассмотрении";

    if (latestRequest.status === "approved") {
      statusEmoji = "✅";
      statusText = "Одобрено";
    } else if (latestRequest.status === "rejected") {
      statusEmoji = "❌";
      statusText = `Отклонено: ${latestRequest.rejectionReason || "Причина не указана"}`;
    }

    const statusMessage = `
${statusEmoji} *Статус подписки*

Статус: *${statusText}*
Создано: ${latestRequest.createdAt.toLocaleDateString("ru-RU")}
    `;

    await bot.sendMessage(chatId, statusMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Выбрать тариф", callback_data: "show_plans" }],
          [{ text: "🏠 Главное меню", callback_data: "home" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error sending subscription status:", error);
    try {
      await bot.sendMessage(chatId, "❌ Ошибка при получении статуса. Попробуйте позже.");
    } catch (e) {
      console.error("Failed to send error message:", e);
    }
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
🔔 *Новый запрос на подписку*

ID запроса: \`${requestId}\`
Telegram ID: ${telegramId}
Тариф: *${planName}*
Сумма: *${formatPrice(price)}*
Время: ${new Date().toLocaleString("ru-RU")}

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
✅ *Подписка активирована!*

Тариф: *${planName}*
Действует до: *${expiresAt.toLocaleDateString("ru-RU")}*

Вы получили доступ ко всем премиум-функциям приложения RTrader!

🚀 Откройте приложение, чтобы начать.
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
❌ *Запрос на подписку отклонён*

Причина: ${reason}

Пожалуйста, свяжитесь со службой поддержки для получения дополнительной информации или повторите попытку с другим способом оплаты.

📞 Поддержка: @rtrader_support
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
⏰ *Подписка истекает скоро*

Ваша подписка истекает через *${daysRemaining} дней*.

Продлите подписку, чтобы продолжить пользоваться премиум-функциями!

/subscribe
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Продлить подписку", callback_data: "show_plans" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error notifying user expiry warning:", error);
  }
}

export default bot;
