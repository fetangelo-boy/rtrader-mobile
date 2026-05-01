/**
 * Telegram Bot Webhook Handler
 * 
 * Handles incoming updates from @rtrader_mobapp_bot
 * - /start command: initiates subscription flow
 * - Payment confirmation: generates login credentials and deep link
 * - Subscription management
 */

import { Router } from "express";
import { getServerSupabase } from "../../lib/supabase";
import { generateAccessToken } from "../_core/jwt";

const router = Router();

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
  

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    document?: {
      file_id: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    data: string;
  };
}

/**
 * Send message via Telegram API
 */
async function sendTelegramMessage(chatId: number, text: string, options?: any) {
  try {
    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...options,
      }),
    });

    if (!response.ok) {
      console.error(`[Bot] Failed to send message: ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Bot] Error sending message:", error);
    return false;
  }
}

/**
 * Send inline keyboard with buttons
 */
async function sendKeyboard(
  chatId: number,
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>
) {
  return sendTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

/**
 * Handle /start command
 */
async function handleStartCommand(update: TelegramUpdate) {
  const message = update.message!;
  const telegramId = message.from.id;
  const firstName = message.from.first_name;
  const chatId = message.chat.id;

  console.log(`[Bot] /start from ${firstName} (${telegramId})`);

  // Check if user already has subscription
  const supabase = getServerSupabase();
  const { data: users } = await supabase.auth.admin.listUsers();

  const existingUser = users?.find(
    (u: any) => u.user_metadata?.telegram_id === String(telegramId)
  );

  if (existingUser) {
    // User already has account
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", existingUser.id)
      .single();

    if (subscription && subscription.is_active) {
      // Generate login credentials via deep link
      const accessToken = generateAccessToken(
        existingUser.id,
        existingUser.email
      );

      const deepLink = `rtrader://login?email=${encodeURIComponent(existingUser.email)}&password=${encodeURIComponent(accessToken)}`;

      await sendTelegramMessage(
        chatId,
        `✅ <b>Добро пожаловать, ${firstName}!</b>\n\n` +
          `Ваша подписка активна. Нажмите кнопку ниже для входа в приложение:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📱 Открыть RTrader",
                  url: deepLink,
                },
              ],
            ],
          },
        }
      );
    } else {
      // Subscription expired
      await sendTelegramMessage(
        chatId,
        `⏰ <b>Подписка истекла</b>\n\n` +
          `Ваша подписка больше не активна. Пожалуйста, оплатите новую подписку.\n\n` +
          `Стоимость: 99 RUB/месяц\n\n` +
          `Свяжитесь с администратором: @rhodes4ever`
      );
    }
  } else {
    // New user - show subscription options
    await sendTelegramMessage(
      chatId,
      `👋 <b>Добро пожаловать в RTrader!</b>\n\n` +
        `Это приложение для трейдеров и инвесторов.\n\n` +
        `<b>Возможности:</b>\n` +
        `• Реал-тайм чаты с сообществом\n` +
        `• Обсуждение стратегий\n` +
        `• Управление подписками\n` +
        `• Уведомления о сообщениях\n\n` +
        `<b>Стоимость подписки:</b> 99 RUB/месяц\n\n` +
        `Для оплаты свяжитесь с администратором: @rhodes4ever`
    );

    await sendKeyboard(
      chatId,
      `Выберите опцию:`,
      [
        [
          {
            text: "💳 Оплатить подписку",
            callback_data: "subscribe_premium",
          },
        ],
        [
          {
            text: "❓ Помощь",
            callback_data: "help",
          },
        ],
      ]
    );
  }
}

/**
 * Handle callback queries (button presses)
 */
async function handleCallbackQuery(update: TelegramUpdate) {
  const query = update.callback_query!;
  const telegramId = query.from.id;
  const firstName = query.from.first_name;
  const chatId = telegramId;
  const data = query.data;

  console.log(`[Bot] Callback: ${data} from ${firstName} (${telegramId})`);

  if (data === "subscribe_premium") {
    await sendTelegramMessage(
      chatId,
      `💳 <b>Оплата подписки</b>\n\n` +
        `Стоимость: 99 RUB/месяц\n\n` +
        `Для оплаты свяжитесь с администратором:\n` +
        `<a href="https://t.me/rhodes4ever">@rhodes4ever</a>\n\n` +
        `После оплаты администратор активирует вашу подписку.`
    );
  } else if (data === "help") {
    await sendTelegramMessage(
      chatId,
      `❓ <b>Справка</b>\n\n` +
        `<b>Как начать:</b>\n` +
        `1. Оплатите подписку (99 RUB/месяц)\n` +
        `2. Администратор активирует доступ\n` +
        `3. Вернитесь в приложение и нажмите "Войти"\n\n` +
        `<b>Поддержка:</b>\n` +
        `<a href="https://t.me/rhodes4ever">@rhodes4ever</a>`
    );
  }

  // Answer callback query to remove loading state
  try {
    await fetch(`${BOT_API_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: query.id,
      }),
    });
  } catch (error) {
    console.error("[Bot] Error answering callback query:", error);
  }
}

/**
 * Webhook endpoint for Telegram updates
 * POST /api/telegram/webhook
 */
router.post("/webhook", async (req, res) => {
  try {
    const update: TelegramUpdate = req.body;

    console.log(`[Bot] Update ${update.update_id}:`, {
      hasMessage: !!update.message,
      hasCallback: !!update.callback_query,
    });

    // Handle text messages
    if (update.message?.text) {
      const text = update.message.text;

      if (text === "/start") {
        await handleStartCommand(update);
      } else {
        // Echo unknown commands
        await sendTelegramMessage(
          update.message.chat.id,
          `❓ Неизвестная команда: <code>${text}</code>\n\n` +
            `Используйте /start для начала.`
        );
      }
    }

    // Handle button clicks
    if (update.callback_query) {
      await handleCallbackQuery(update);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("[Bot] Error processing update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Set webhook URL
 * POST /api/telegram/set-webhook
 */
router.post("/set-webhook", async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(400).json({ error: "BOT_TOKEN not configured" });
    }

    const webhookUrl = req.body.url || process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(400).json({ error: "Webhook URL required" });
    }

    const fullWebhookUrl = `${webhookUrl}/api/telegram/webhook`;

    console.log(`[Bot] Setting webhook to: ${fullWebhookUrl}`);

    const response = await fetch(`${BOT_API_URL}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: fullWebhookUrl,
        drop_pending_updates: true,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("[Bot] Failed to set webhook:", data);
      return res.status(400).json({ error: data.description });
    }

    console.log("[Bot] Webhook set successfully");
    res.json({ ok: true, webhook_url: fullWebhookUrl });
  } catch (error) {
    console.error("[Bot] Error setting webhook:", error);
    res.status(500).json({ error: "Failed to set webhook" });
  }
});

/**
 * Get webhook info
 * GET /api/telegram/webhook-info
 */
router.get("/webhook-info", async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(400).json({ error: "BOT_TOKEN not configured" });
    }

    const response = await fetch(`${BOT_API_URL}/getWebhookInfo`);
    const data = await response.json();

    if (!data.ok) {
      return res.status(400).json({ error: data.description });
    }

    res.json(data.result);
  } catch (error) {
    console.error("[Bot] Error getting webhook info:", error);
    res.status(500).json({ error: "Failed to get webhook info" });
  }
});

export const registerTelegramBotRoutes = (app: any) => {
  app.use("/api/telegram", router);
};
