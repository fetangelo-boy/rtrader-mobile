/**
 * Telegram Bot Long Polling Handler
 * 
 * Handles updates from @rtrader_mobapp_bot using Long Polling
 * - No webhook required (no public URL needed)
 * - /start command: initiates subscription flow
 * - Payment confirmation: generates login credentials and deep link
 * - Subscription management
 */

import { getDb } from "../db";
import { generateAccessToken } from "../_core/jwt";
import { authUsers } from "../../drizzle/schema_auth";
import { eq } from "drizzle-orm";

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

  try {
    // Check if user already has account in database
    const db = await getDb();
    if (!db) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Ошибка подключения к БД</b>\n\n` +
          `Пожалуйста, попробуйте позже.`
      );
      return;
    }

    // Query users table for existing account
    // Note: authUsers table doesn't have telegramId field in current schema
    // For now, we'll skip user lookup and show welcome message to all
    // TODO: Add telegramId field to authUsers schema in drizzle/schema_auth.ts
    
    const existingUser = null;

    // Show welcome and subscription options
    console.log(`[Bot] User /start: ${firstName} (${telegramId})`);
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
  } catch (error) {
    console.error("[Bot] Error in handleStartCommand:", error);
    await sendTelegramMessage(
      chatId,
      `❌ <b>Ошибка</b>\n\n` +
        `Что-то пошло не так. Пожалуйста, попробуйте позже.`
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

  try {
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
  } catch (error) {
    console.error("[Bot] Error in handleCallbackQuery:", error);
  }
}

/**
 * Process incoming update
 */
async function processUpdate(update: TelegramUpdate) {
  try {
    // Handle text messages
    if (update.message?.text) {
      const text = update.message.text;

      if (text === "/start" || text.startsWith("/start ")) {
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
  } catch (error) {
    console.error("[Bot] Error processing update:", error);
  }
}

/**
 * Long Polling loop
 */
let isPolling = false;
let lastUpdateId = 0;
let pollingPromise: Promise<void> | null = null;

async function startPolling() {
  if (isPolling) {
    console.log("[Bot] Polling already running");
    return;
  }

  if (!BOT_TOKEN) {
    console.error("[Bot] BOT_TOKEN not configured");
    return;
  }

  isPolling = true;
  console.log("[Bot] Starting Long Polling for @rtrader_mobapp_bot...");

  while (isPolling) {
    try {
      const response = await fetch(`${BOT_API_URL}/getUpdates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset: lastUpdateId + 1,
          timeout: 30, // 30 second timeout
          allowed_updates: ["message", "callback_query"],
        }),
      });

      if (!response.ok) {
        console.error(`[Bot] Failed to get updates: ${response.statusText}`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before retry
        continue;
      }

      const data = await response.json();

      if (!data.ok) {
        console.error("[Bot] API error:", data.description);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // Process each update
      if (data.result && data.result.length > 0) {
        console.log(`[Bot] Processing ${data.result.length} update(s)`);
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          await processUpdate(update);
        }
      }
    } catch (error) {
      console.error("[Bot] Polling error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before retry
    }
  }
}

/**
 * Stop polling
 */
function stopPolling() {
  isPolling = false;
  console.log("[Bot] Polling stopped");
}

/**
 * Initialize bot polling
 */
export function initializeTelegramBot() {
  if (!BOT_TOKEN) {
    console.warn("[Bot] BOT_TOKEN not configured, skipping bot initialization");
    return;
  }

  console.log("[Bot] Initializing Telegram bot with Long Polling");
  pollingPromise = startPolling().catch((error) => {
    console.error("[Bot] Failed to start polling:", error);
  });
}

/**
 * Cleanup on shutdown
 */
export function shutdownTelegramBot() {
  stopPolling();
}
