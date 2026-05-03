/**
 * Telegram Bot Long Polling Handler for @rtrader_mobapp_bot
 *
 * Flow:
 * 1. /start → welcome + main menu
 * 2. User selects tariff → payment details shown (T-Bank card)
 * 3. User sends receipt photo → admin notified via Telegram
 * 4. Admin approves via /approve command → system creates account
 * 5. Bot sends credentials + deep link to user
 */

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const SERVER_URL = process.env.SERVER_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");

// Admin Telegram IDs who can approve subscriptions (usernames or numeric IDs)
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Tariff plans
const PLANS = [
  { id: "week", name: "1 неделя", price: 1700, days: 7, label: "1 700 ₽/нед" },
  { id: "month", name: "1 месяц", price: 4000, days: 30, label: "4 000 ₽/мес" },
  { id: "quarter", name: "3 месяца", price: 10300, days: 90, label: "10 300 ₽ (скидка 14%)" },
  { id: "halfyear", name: "Полгода", price: 20000, days: 180, label: "20 000 ₽ (скидка 17%)" },
];

// Payment details
const PAYMENT = {
  bank: "Т-Банк",
  card: "5536 9138 8189 0954",
  expiry: "09/28",
  name: "Зерянский Роман Олегович",
};

// In-memory state: pending receipt submissions
// key = telegramId, value = selected plan
const pendingPayments = new Map<number, { planId: string; planName: string; price: number; days: number }>();

// Long polling state
let pollingOffset = 0;
let pollingActive = false;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    photo?: Array<{ file_id: string; file_size: number; width: number; height: number }>;
    document?: { file_id: string; file_name?: string; mime_type?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    message?: { chat: { id: number }; message_id: number };
    data: string;
  };
}

// ─── Telegram API helpers ────────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string, options?: Record<string, unknown>) {
  try {
    const res = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...options }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Bot] sendMessage failed (${res.status}): ${err}`);
    }
    return res.ok;
  } catch (e) {
    console.error("[Bot] sendMessage error:", e);
    return false;
  }
}

async function answerCallbackQuery(id: string, text?: string) {
  try {
    await fetch(`${BOT_API_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id, text }),
    });
  } catch (e) {
    console.error("[Bot] answerCallbackQuery error:", e);
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function showMainMenu(chatId: number, firstName: string) {
  try {
    await sendMessage(
      chatId,
      `🏠 <b>Главное меню</b>\n\nПривет, ${firstName}! Чем могу помочь?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💳 Оформить подписку", callback_data: "subscribe" }],
            [{ text: "📊 Проверить статус", callback_data: "status" }],
            [{ text: "❓ Помощь", callback_data: "help" }],
          ],
        },
      }
    );
  } catch (e) {
    console.error("[Bot] showMainMenu error:", e);
  }
}

async function showTariffMenu(chatId: number) {
  try {
    const keyboard = PLANS.map((plan) => [
      { text: plan.label, callback_data: `plan_${plan.id}` },
    ]);
    keyboard.push([{ text: "◀️ Назад", callback_data: "home" }]);

    await sendMessage(
      chatId,
      `💰 <b>Выберите тариф:</b>\n\nДоступ к закрытому сообществу трейдеров.`,
      {
        reply_markup: { inline_keyboard: keyboard },
      }
    );
  } catch (e) {
    console.error("[Bot] showTariffMenu error:", e);
  }
}

async function handlePlanSelected(chatId: number, telegramId: number, planId: string) {
  try {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      await sendMessage(chatId, "❌ Тариф не найден.");
      return;
    }

    pendingPayments.set(telegramId, {
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      days: plan.days,
    });

    const text =
      `💳 <b>Оплата подписки</b>\n\n` +
      `Тариф: <b>${plan.name}</b>\n` +
      `Сумма: <b>${plan.price} ₽</b>\n\n` +
      `<b>Реквизиты:</b>\n` +
      `Банк: ${PAYMENT.bank}\n` +
      `Карта: <code>${PAYMENT.card}</code>\n` +
      `Срок: ${PAYMENT.expiry}\n` +
      `Владелец: ${PAYMENT.name}\n\n` +
      `<b>Инструкция:</b>\n` +
      `1. Переведите ${plan.price} ₽ на карту выше\n` +
      `2. Сделайте скриншот квитанции\n` +
      `3. Отправьте скриншот сюда (фото или документ)\n\n` +
      `После проверки администратором вам будут отправлены учетные данные.`;

    await sendMessage(chatId, text);
  } catch (e) {
    console.error("[Bot] handlePlanSelected error:", e);
  }
}

async function handleReceiptReceived(update: TelegramUpdate) {
  try {
    const msg = update.message!;
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const firstName = msg.from.first_name;

    const pending = pendingPayments.get(telegramId);
    if (!pending) {
      await sendMessage(chatId, "❌ Сначала выберите тариф через /subscribe");
      return;
    }

    // Notify admins
    const adminText =
      `📸 <b>Новая квитанция</b>\n\n` +
      `Пользователь: ${firstName} (ID: ${telegramId})\n` +
      `Тариф: ${pending.planName}\n` +
      `Сумма: ${pending.price} ₽\n\n` +
      `<b>Для одобрения:</b>\n` +
      `<code>/approve ${telegramId} ${pending.planId}</code>`;

    for (const adminId of ADMIN_TELEGRAM_IDS) {
      await sendMessage(Number(adminId), adminText);
    }

    await sendMessage(chatId, "✅ Квитанция отправлена на проверку. Ожидайте подтверждения администратора.");
  } catch (e) {
    console.error("[Bot] handleReceiptReceived error:", e);
  }
}

async function handleStatus(chatId: number) {
  try {
    await sendMessage(
      chatId,
      `📊 <b>Статус подписки</b>\n\nДля проверки статуса подписки используйте приложение RTrader.`
    );
  } catch (e) {
    console.error("[Bot] handleStatus error:", e);
  }
}

async function handleHelp(chatId: number) {
  try {
    await sendMessage(
      chatId,
      `❓ <b>Помощь</b>\n\n` +
        `<b>Команды:</b>\n` +
        `/start - Начать\n` +
        `/subscribe - Оформить подписку\n` +
        `/status - Проверить статус\n` +
        `/help - Эта справка\n\n` +
        `<b>Вопросы?</b>\n` +
        `Напишите нам в поддержку.`
    );
  } catch (e) {
    console.error("[Bot] handleHelp error:", e);
  }
}

async function handleStart(update: TelegramUpdate) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  const startParam = msg.text?.split(" ")[1];
  console.log(`[Bot] /start from ${firstName} (${msg.from.id})`);

  if (startParam === "renew") {
    await showTariffMenu(chatId);
    return;
  }

  await sendMessage(
    chatId,
    `👋 <b>Добро пожаловать в RTrader Club, ${firstName}!</b>\n\n` +
      `Это закрытое сообщество трейдеров и инвесторов.\n\n` +
      `<b>Что вас ждёт:</b>\n` +
      `• Реал-тайм чаты с сообществом\n` +
      `• Торговые идеи и аналитика\n` +
      `• Обсуждение стратегий\n` +
      `• Уведомления о сигналах\n\n` +
      `Для получения доступа оформите подписку.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Оформить подписку", callback_data: "subscribe" }],
          [{ text: "📊 Проверить статус", callback_data: "status" }],
          [{ text: "❓ Помощь", callback_data: "help" }],
        ],
      },
    }
  );
}

async function handleApproveCommand(update: TelegramUpdate) {
  try {
    const msg = update.message!;
    if (!msg) {
      console.error("[Bot] handleApproveCommand: no message");
      return;
    }
    const adminId = msg.from.id;
    const text = msg.text || "";
    const parts = text.split(" ");

    // Check if user is admin
    if (!ADMIN_TELEGRAM_IDS.includes(String(adminId))) {
      await sendMessage(msg.chat.id, "❌ У вас нет прав для этой команды.");
      return;
    }

    const telegramId = parseInt(parts[1]);
    const planId = parts[2];

    if (!telegramId || !planId) {
      await sendMessage(msg.chat.id, "❌ Использование: /approve <telegram_id> <plan_id>");
      return;
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      await sendMessage(msg.chat.id, "❌ План не найден.");
      return;
    }

    // Call server API to create subscription
    const response = await fetch(`${SERVER_URL}/api/admin/approve-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_API_KEY || "",
      },
      body: JSON.stringify({
        telegram_id: telegramId,
        plan_id: planId,
        days: plan.days,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      await sendMessage(msg.chat.id, `❌ Ошибка: ${data.error || "Неизвестная ошибка"}`);
      return;
    }

    // Send credentials and deep link to user
    const deepLink = `${data.deepLink || `rtrader://auth/telegram?token=${data.token}`}`;
    const userMessage =
      `✅ <b>Подписка активирована!</b>\n\n` +
      `Тариф: ${plan.name}\n` +
      `Действительна до: ${data.expiresAt || "указанной даты"}\n\n` +
      `<b>Для входа в приложение:</b>\n` +
      `Нажмите кнопку ниже или перейдите по ссылке:\n\n` +
      `<a href="${deepLink}">🚀 Войти в RTrader</a>`;

    await sendMessage(telegramId, userMessage);
    await sendMessage(msg.chat.id, `✅ Подписка одобрена для пользователя ${telegramId}`);

    pendingPayments.delete(telegramId);
  } catch (e) {
    console.error("[Bot] handleApproveCommand error:", e);
    const chatId = update.message?.chat.id;
    if (chatId) {
      await sendMessage(chatId, `❌ Ошибка при обработке команды: ${e}`);
    }
  }
}

async function handleRenewCommand(update: TelegramUpdate) {
  try {
    const msg = update.message!;
    const chatId = msg.chat.id;
    await showTariffMenu(chatId);
  } catch (e) {
    console.error("[Bot] handleRenewCommand error:", e);
  }
}

// ─── Update processor ────────────────────────────────────────────────────────

async function processUpdate(update: TelegramUpdate) {
  try {
    // Text messages
    if (update.message?.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;
      const firstName = update.message.from.first_name;

      if (text.startsWith("/start")) {
        await handleStart(update);
      } else if (text === "/subscribe") {
        await showTariffMenu(chatId);
      } else if (text === "/status") {
        await handleStatus(chatId);
      } else if (text === "/help") {
        await handleHelp(chatId);
      } else if (text.startsWith("/approve")) {
        await handleApproveCommand(update);
      } else if (text.startsWith("/renew")) {
        await handleRenewCommand(update);
      } else {
        await sendMessage(chatId, `❓ Неизвестная команда.\n\nИспользуйте /start для начала.`);
      }
      return;
    }

    // Photo or document (receipt)
    if (update.message?.photo || update.message?.document) {
      await handleReceiptReceived(update);
      return;
    }

    // Callback queries (button presses)
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.from.id;
      const firstName = query.from.first_name;
      const data = query.data;

      await answerCallbackQuery(query.id);

      if (data === "home") {
        await showMainMenu(chatId, firstName);
      } else if (data === "subscribe") {
        await showTariffMenu(chatId);
      } else if (data === "status") {
        await handleStatus(chatId);
      } else if (data === "help") {
        await handleHelp(chatId);
      } else if (data.startsWith("plan_")) {
        const planId = data.replace("plan_", "");
        await handlePlanSelected(chatId, query.from.id, planId);
      }
    }
  } catch (e) {
    console.error("[Bot] processUpdate error:", e);
  }
}

// ─── Long Polling ────────────────────────────────────────────────────────────

async function pollUpdates() {
  if (!pollingActive) return;

  try {
    const res = await fetch(`${BOT_API_URL}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: pollingOffset,
        timeout: 30,
        allowed_updates: ["message", "callback_query"],
      }),
    });

    if (!res.ok) {
      console.error(`[Bot] getUpdates failed (${res.status})`);
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      console.error(`[Bot] getUpdates error: ${data.description}`);
      return;
    }

    const updates = data.result || [];
    for (const update of updates) {
      pollingOffset = Math.max(pollingOffset, update.update_id + 1);
      await processUpdate(update);
    }
  } catch (e) {
    console.error("[Bot] pollUpdates error:", e);
  }
}

async function startPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log("[Bot] ✅ Long polling started");

  while (pollingActive) {
    await pollUpdates();
    // Small delay to avoid busy loop
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function initializeTelegramBot() {
  if (!BOT_TOKEN) {
    console.warn("[Bot] BOT_TOKEN not configured, skipping bot initialization");
    return;
  }
  console.log("[Bot] 🤖 Initializing @rtrader_mobapp_bot (long polling mode)...");
  startPolling().catch((e) => console.error("[Bot] Fatal polling error:", e));
}

export function shutdownTelegramBot() {
  console.log("[Bot] Shutting down long polling...");
  pollingActive = false;
}
