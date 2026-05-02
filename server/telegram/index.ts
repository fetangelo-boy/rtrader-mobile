import { subscriptionPlans } from "../../drizzle/schema_subscriptions";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import bot, {
  sendTariffMenu,
  sendPaymentInstructions,
  sendSubscriptionStatus,
  notifyAdminNewRequest,
} from "./bot-handler";

// @ts-ignore
import { v4 as uuidv4 } from "uuid";

const ADMIN_IDS = process.env.ADMIN_IDS?.split(",") || ["rhodes4ever"];

// Single DB connection
let _db: any = null;
function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}
const db = getDb();

/**
 * Initialize Telegram bot handlers
 */
export function initializeTelegramBot(): void {
  console.log("[Telegram] Initializing bot handlers...");

  /**
   * /start command
   */
  bot.onText(/\/start/, async (msg: any) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const firstName = msg.from.first_name || "Пользователь";

    const welcomeMessage = `
👋 Добро пожаловать в RTrader Mobile App!

Я ваш менеджер подписок. Вот что я могу вам предложить:

📊 *Доступные команды:*
• /subscribe - Выбрать тариф подписки
• /status - Проверить статус подписки
• /help - Справка

Давайте начнём! Используйте /subscribe для просмотра тарифов.
    `;

    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Выбрать тариф", callback_data: "show_plans" }],
          [{ text: "📋 Проверить статус", callback_data: "check_status" }],
        ],
      },
    });
  });

  /**
   * /subscribe command
   */
  bot.onText(/\/subscribe/, async (msg: any) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    await sendTariffMenu(chatId, userId);
  });

  /**
   * /status command
   */
  bot.onText(/\/status/, async (msg: any) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    await sendSubscriptionStatus(chatId, userId);
  });

  /**
   * /help command
   */
  bot.onText(/\/help/, async (msg: any) => {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 *Справка*

Я помогу вам управлять подпиской на RTrader.

*Доступные команды:*
• /start - Главное меню
• /subscribe - Выбрать тариф подписки
• /status - Проверить статус подписки
• /help - Эта справка

*Как подписаться:*
1. Нажмите /subscribe
2. Выберите подходящий тариф
3. Следуйте инструкциям по оплате
4. Отправьте скриншот платежа
5. Администратор проверит и активирует подписку

*Вопросы?*
Свяжитесь со службой поддержки: @rtrader_support
    `;

    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: "Markdown",
    });
  });

  /**
   * Callback query handler (inline buttons)
   */
  bot.on("callback_query", async (query: any) => {
    const chatId = query.message.chat.id;
    const userId = String(query.from.id);
    const data = query.data;

    console.log(`[Bot] Callback: ${data} from ${chatId}`);

    try {
      // Show plans
      if (data === "show_plans") {
        await sendTariffMenu(chatId, userId);
      }

      // Check status
      else if (data === "check_status") {
        await sendSubscriptionStatus(chatId, String(userId));
      }

      // Select tariff
      else if (data.startsWith("tariff_")) {
        const planId = data.replace("tariff_", "");
        const firstName = query.from.first_name || "Пользователь";
        
        // Send payment instructions (this will also create the subscription request)
        await sendPaymentInstructions(chatId, planId, String(userId), firstName);

        // Notify admin about new request (don't await to avoid delays)
        try {
          if (db) {
            const plan = await db
              .select()
              .from(subscriptionPlans)
              .where(eq(subscriptionPlans.id, planId))
              .limit(1);

            if (plan.length > 0) {
              await notifyAdminNewRequest(
                uuidv4(),
                String(chatId),
                plan[0].name,
                Number(plan[0].priceRub)
              );
            }
          }
        } catch (error) {
          console.error("[Bot] Error notifying admin:", error);
          // Don't send error to user, admin notification is not critical
        }
      }

      // Home menu
      else if (data === "home") {
        const welcomeMessage = `
👋 Главное меню

Я ваш менеджер подписок. Вот что я могу вам предложить:

📋 *Доступные команды:*
• /subscribe - Выбрать тариф подписки
• /status - Проверить статус подписки
• /help - Справка
        `;
        await bot.sendMessage(chatId, welcomeMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Выбрать тариф", callback_data: "show_plans" }],
              [{ text: "📋 Проверить статус", callback_data: "check_status" }],
            ],
          },
        });
      }

      // Cancel
      else if (data === "cancel") {
        await bot.sendMessage(chatId, "❌ Операция отменена.");
      }

      // Contact support
      else if (data === "contact_support") {
        await bot.sendMessage(
          chatId,
          "📞 Свяжитесь со службой поддержки: @rtrader_support"
        );
      }

      // Upload receipt
      else if (data === "upload_receipt") {
        await bot.sendMessage(
          chatId,
          "📸 Отправьте скриншот платежа в виде изображения или документа.\n\nАдминистратор проверит платёж и активирует подписку."
        );
      }
    } catch (error) {
      console.error("[Bot] Error handling callback:", error);
      try {
        await bot.sendMessage(chatId, "❌ Ошибка при обработке запроса. Попробуйте позже.");
      } catch (e) {
        console.error("[Bot] Failed to send error message:", e);
      }
    }
  });

  console.log("[Telegram] Bot handlers initialized successfully");
  
  // Enable polling AFTER all handlers are registered
  bot.startPolling();
  console.log("[Telegram] Bot polling started");
}

/**
 * Express route handler for Telegram webhook
 */
export async function handleTelegramWebhook(req: any, res: any) {
  try {
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("[Bot] Webhook error:", error);
    res.sendStatus(500);
  }
}
