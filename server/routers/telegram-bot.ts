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
    console.error(`[Bot] showMainMenu error for ${firstName}:`, e);
  }
}

async function handleStart(update: TelegramUpdate) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  const startParam = msg.text?.split(" ")[1];

  console.log(`[Bot] /start from ${firstName} (${msg.from.id})`);

  try {
    if (startParam === "renew") {
      await showTariffMenu(chatId);
      return;
    }

    const success = await sendMessage(
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
    if (!success) {
      console.error(`[Bot] /start: sendMessage failed for chat ${chatId}`);
    }
  } catch (e) {
    console.error(`[Bot] /start handler error for ${firstName} (${msg.from.id}):`, e);
  }
}

async function showTariffMenu(chatId: number) {
  await sendMessage(
    chatId,
    `📋 <b>Подписка RTrading Club</b>\n\nВыберите тариф:`,
    {
      reply_markup: {
        inline_keyboard: [
          ...PLANS.map((p) => [{ text: `${p.name} — ${p.label}`, callback_data: `plan_${p.id}` }]),
          [{ text: "🏠 Главное меню", callback_data: "home" }],
        ],
      },
    }
  );
}

async function handlePlanSelected(chatId: number, telegramId: number, planId: string) {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    await sendMessage(chatId, "❌ Тариф не найден. Попробуйте снова.");
    return;
  }

  pendingPayments.set(telegramId, {
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    days: plan.days,
  });

  await sendMessage(
    chatId,
    `✅ <b>Вы выбрали: ${plan.name}</b>\n` +
      `💰 Стоимость: <b>${plan.price.toLocaleString("ru-RU")} ₽</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Реквизиты для оплаты:</b>\n\n` +
      `🏦 Банк: <b>${PAYMENT.bank}</b>\n` +
      `💳 Карта: <code>${PAYMENT.card}</code>\n` +
      `📅 Срок: <b>${PAYMENT.expiry}</b>\n` +
      `👤 Получатель: <b>${PAYMENT.name}</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Как оплатить:</b>\n` +
      `1. Переведите <b>${plan.price.toLocaleString("ru-RU")} ₽</b> на карту выше\n` +
      `2. Сделайте скриншот или фото чека\n` +
      `3. Отправьте чек прямо сюда в этот чат\n\n` +
      `⏳ После проверки вы получите доступ в течение нескольких минут.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Главное меню", callback_data: "home" }],
        ],
      },
    }
  );
}

async function handleReceiptReceived(update: TelegramUpdate) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name;
  const username = msg.from.username;

  const pending = pendingPayments.get(telegramId);
  if (!pending) {
    await sendMessage(
      chatId,
      `❓ Сначала выберите тариф.\n\nНажмите /start для начала.`
    );
    return;
  }

  // Confirm to user
  await sendMessage(
    chatId,
    `✅ <b>Чек получен!</b>\n\n` +
      `Ваша заявка на тариф <b>${pending.planName}</b> (${pending.price.toLocaleString("ru-RU")} ₽) отправлена на проверку.\n\n` +
      `⏳ Обычно проверка занимает несколько минут.\n` +
      `После одобрения вы получите данные для входа в приложение.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Главное меню", callback_data: "home" }],
        ],
      },
    }
  );

  // Notify admins
  const adminText =
    `🔔 <b>Новая заявка на подписку!</b>\n\n` +
    `👤 Пользователь: <b>${firstName}</b>${username ? ` (@${username})` : ""}\n` +
    `🆔 Telegram ID: <code>${telegramId}</code>\n` +
    `📋 Тариф: <b>${pending.planName}</b>\n` +
    `💰 Сумма: <b>${pending.price.toLocaleString("ru-RU")} ₽</b>\n` +
    `📅 Дней: <b>${pending.days}</b>\n\n` +
    `Для одобрения отправьте:\n` +
    `<code>/approve ${telegramId} ${firstName} ${pending.days}</code>`;

  for (const adminId of ADMIN_TELEGRAM_IDS) {
    const adminChatId = parseInt(adminId, 10);
    if (!isNaN(adminChatId)) {
      await sendMessage(adminChatId, adminText);
      // Forward receipt to admin
      try {
        await fetch(`${BOT_API_URL}/forwardMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            from_chat_id: chatId,
            message_id: msg.message_id,
          }),
        });
      } catch (e) {
        console.error("[Bot] Failed to forward receipt:", e);
      }
    }
  }

  console.log(`[Bot] Receipt received from ${firstName} (${telegramId}) for plan ${pending.planName}`);
}

async function handleApproveCommand(update: TelegramUpdate) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const senderUsername = msg.from.username || String(msg.from.id);
  const senderId = String(msg.from.id);

  const isAdmin =
    ADMIN_TELEGRAM_IDS.includes(senderUsername) ||
    ADMIN_TELEGRAM_IDS.includes(senderId);

  if (!isAdmin) {
    await sendMessage(chatId, "❌ У вас нет прав для этой команды.");
    return;
  }

  // /approve <telegram_id> <name> <days>
  const parts = msg.text!.trim().split(/\s+/);
  if (parts.length < 4) {
    await sendMessage(
      chatId,
      "❌ Формат: <code>/approve &lt;telegram_id&gt; &lt;имя&gt; &lt;дней&gt;</code>\n" +
        "Пример: <code>/approve 123456789 Иван 30</code>"
    );
    return;
  }

  const targetTelegramId = parseInt(parts[1], 10);
  const targetName = parts[2];
  const days = parseInt(parts[3], 10);

  if (isNaN(targetTelegramId) || isNaN(days)) {
    await sendMessage(chatId, "❌ Неверный формат telegram_id или дней.");
    return;
  }

  await sendMessage(chatId, `⏳ Создаю аккаунт для пользователя ${targetTelegramId}...`);

  try {
    const response = await fetch(`${SERVER_URL}/api/admin/create-subscriber`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_API_KEY || "",
      },
      body: JSON.stringify({
        telegram_id: targetTelegramId,
        telegram_name: targetName,
        days,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (data.error?.includes("already exists")) {
        // User exists — auto-renew subscription and resend credentials
        await sendMessage(chatId, `⏳ Пользователь уже существует. Продлеваю подписку и сбрасываю пароль...`);
        try {
          // Step 1: Renew subscription
          const renewResponse = await fetch(`${SERVER_URL}/api/admin/renew-subscription`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_API_KEY || "" },
            body: JSON.stringify({ telegram_id: String(targetTelegramId), days }),
          });
          const renewData = await renewResponse.json();
          if (!renewResponse.ok || !renewData.success) {
            await sendMessage(chatId, `❌ Ошибка продления: ${renewData.error || "неизвестная ошибка"}`);
            return;
          }
          // Step 2: Reset password to get new credentials
          const resetResponse = await fetch(`${SERVER_URL}/api/admin/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_API_KEY || "" },
            body: JSON.stringify({ telegram_id: String(targetTelegramId) }),
          });
          const resetData = await resetResponse.json();
          if (!resetResponse.ok || !resetData.success) {
            await sendMessage(chatId, `❌ Ошибка сброса пароля: ${resetData.error || "неизвестная ошибка"}`);
            return;
          }
          const renewedEmail = resetData.email;
          const newPassword = resetData.password;
          const rawExpiry = renewData.subscription?.expires_at;
          const expiryDate = rawExpiry
            ? new Date(rawExpiry).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "неизвестно";
          // Notify admin
          await sendMessage(
            chatId,
            `✅ <b>Подписка продлена!</b>\n\n` +
              `👤 Пользователь: ${targetName}\n` +
              `📧 Email: <code>${renewedEmail}</code>\n` +
              `🔑 Новый пароль: <code>${newPassword}</code>\n` +
              `📅 Подписка до: ${expiryDate}`
          );
          // Build deep link and send credentials to user
          const deepLinkRenew = `rtrader://login?email=${encodeURIComponent(renewedEmail)}&password=${encodeURIComponent(newPassword)}`;
          await sendMessage(
            targetTelegramId,
            `🎉 <b>Доступ одобрен!</b>\n\n` +
              `Ваша подписка <b>активирована</b> на ${days} дней.\n` +
              `Действует до: <b>${expiryDate}</b>\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `<b>Данные для входа:</b>\n\n` +
              `📧 Email: <code>${renewedEmail}</code>\n` +
              `🔑 Пароль: <code>${newPassword}</code>\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `<b>Как войти:</b>\n` +
              `1. Нажмите кнопку «Войти в RTrader» ниже — вход автоматически\n` +
              `2. Или откройте приложение вручную и введите данные выше\n\n` +
              `Добро пожаловать в RTrading Club! 🚀`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🚀 Войти в RTrader", url: deepLinkRenew }],
                  [{ text: "🏠 Главное меню", callback_data: "home" }],
                ],
              },
            }
          );
          pendingPayments.delete(targetTelegramId);
        } catch (renewErr) {
          console.error("[Bot] Auto-renew error:", renewErr);
          await sendMessage(chatId, "❌ Ошибка при автопродлении. Попробуйте /renew вручную.");
        }
      } else {
        await sendMessage(chatId, `❌ Ошибка: ${data.error || "неизвестная ошибка"}`);
      }
      return;
    }

    const { email, password } = data;

    // Notify admin
    await sendMessage(
      chatId,
      `✅ <b>Аккаунт создан!</b>\n\n` +
        `👤 Пользователь: ${targetName}\n` +
        `📧 Email: <code>${email}</code>\n` +
        `🔑 Пароль: <code>${password}</code>\n` +
        `📅 Подписка: ${days} дней`
    );

    // Build deep link for auto-login
    const deepLink = `rtrader://login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    // Send credentials to user
    await sendMessage(
      targetTelegramId,
      `🎉 <b>Доступ одобрен!</b>\n\n` +
        `Ваша подписка <b>активирована</b> на ${days} дней.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Данные для входа:</b>\n\n` +
        `📧 Email: <code>${email}</code>\n` +
        `🔑 Пароль: <code>${password}</code>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Как войти:</b>\n` +
        `1. Нажмите кнопку «Войти в RTrader» ниже — вход автоматически\n` +
        `2. Или откройте приложение вручную и введите данные выше\n\n` +
        `Добро пожаловать в RTrading Club! 🚀`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Войти в RTrader", url: deepLink }],
            [{ text: "🏠 Главное меню", callback_data: "home" }],
          ],
        },
      }
    );

    pendingPayments.delete(targetTelegramId);
    console.log(`[Bot] Approved subscription for ${targetName} (${targetTelegramId}), ${days} days`);
  } catch (e) {
    console.error("[Bot] handleApproveCommand error:", e);
    await sendMessage(chatId, "❌ Ошибка при создании аккаунта. Проверьте логи сервера.");
  }
}

async function handleRenewCommand(update: TelegramUpdate) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const senderUsername = msg.from.username || String(msg.from.id);
  const senderId = String(msg.from.id);

  const isAdmin =
    ADMIN_TELEGRAM_IDS.includes(senderUsername) ||
    ADMIN_TELEGRAM_IDS.includes(senderId);

  if (!isAdmin) {
    await sendMessage(chatId, "❌ У вас нет прав для этой команды.");
    return;
  }

  // /renew <telegram_id> <days>
  const parts = msg.text!.trim().split(/\s+/);
  if (parts.length < 3) {
    await sendMessage(
      chatId,
      "❌ Формат: <code>/renew &lt;telegram_id&gt; &lt;дней&gt;</code>\n" +
        "Пример: <code>/renew 123456789 30</code>"
    );
    return;
  }

  const targetTelegramId = parts[1];
  const days = parseInt(parts[2], 10);

  if (isNaN(days)) {
    await sendMessage(chatId, "❌ Неверный формат дней.");
    return;
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/admin/renew-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_API_KEY || "",
      },
      body: JSON.stringify({ telegram_id: targetTelegramId, days }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      await sendMessage(chatId, `❌ Ошибка: ${data.error || "неизвестная ошибка"}`);
      return;
    }

    // Fix: server returns expires_at inside subscription object
    const rawExpiry = data.expires_at || data.subscription?.expires_at;
    const expiryDate = rawExpiry
      ? new Date(rawExpiry).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "неизвестно";
    await sendMessage(
      chatId,
      `✅ Подписка продлена на ${days} дней.\n` +
        `Новая дата окончания: <b>${expiryDate}</b>`
    );

    const targetId = parseInt(targetTelegramId, 10);
    if (!isNaN(targetId)) {
      await sendMessage(
        targetId,
        `🔄 <b>Подписка продлена!</b>\n\n` +
          `Ваша подписка продлена на <b>${days} дней</b>.\n` +
          `Новая дата окончания: <b>${expiryDate}</b>\n\n` +
          `Добро пожаловать обратно! 🚀`
      );
    }
  } catch (e) {
    console.error("[Bot] handleRenewCommand error:", e);
    await sendMessage(chatId, "❌ Ошибка при продлении подписки.");
  }
}

async function handleStatus(chatId: number) {
  await sendMessage(
    chatId,
    `📊 <b>Статус подписки</b>\n\n` +
      `Для проверки статуса подписки откройте приложение RTrader и перейдите в раздел "Аккаунт".\n\n` +
      `Если у вас нет доступа — оформите подписку.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Оформить подписку", callback_data: "subscribe" }],
          [{ text: "🏠 Главное меню", callback_data: "home" }],
        ],
      },
    }
  );
}

async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `❓ <b>Помощь</b>\n\n` +
      `<b>Как получить доступ:</b>\n` +
      `1. Выберите тариф\n` +
      `2. Оплатите на карту Т-Банк\n` +
      `3. Отправьте скриншот чека сюда\n` +
      `4. Получите данные для входа\n\n` +
      `<b>Доступные команды:</b>\n` +
      `/start — главное меню\n` +
      `/subscribe — выбрать тариф\n` +
      `/status — статус подписки\n` +
      `/help — эта справка\n\n` +
      `<b>Поддержка:</b>\n` +
      `<a href="https://t.me/rhodes4ever">@rhodes4ever</a>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Оформить подписку", callback_data: "subscribe" }],
          [{ text: "🏠 Главное меню", callback_data: "home" }],
        ],
      },
    }
  );
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

// ─── Webhook Handler ─────────────────────────────────────────────────────────

/**
 * Express route handler for Telegram webhook.
 * Register this route in server/_core/index.ts:
 *   app.post("/api/bot/webhook", handleTelegramWebhook);
 */
export async function handleTelegramWebhook(req: any, res: any) {
  try {
    const update = req.body as TelegramUpdate;
    // Respond immediately to Telegram (must be within 5 seconds)
    res.sendStatus(200);
    // Process update asynchronously
    await processUpdate(update);
  } catch (e) {
    console.error("[Bot] Webhook handler error:", e);
  }
}

/**
 * Register the webhook URL with Telegram API.
 * Called once on server startup.
 */
async function registerWebhook() {
  const webhookUrl = `${SERVER_URL}/api/bot/webhook`;
  try {
    const res = await fetch(`${BOT_API_URL}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`[Bot] ✅ Webhook registered: ${webhookUrl}`);
    } else {
      console.error("[Bot] ❌ Failed to register webhook:", data.description);
    }
  } catch (e) {
    console.error("[Bot] registerWebhook error:", e);
  }
}

export function initializeTelegramBot() {
  if (!BOT_TOKEN) {
    console.warn("[Bot] BOT_TOKEN not configured, skipping bot initialization");
    return;
  }
  console.log("[Bot] 🤖 Initializing @rtrader_mobapp_bot (webhook mode)...");
  registerWebhook().catch((e) => console.error("[Bot] Fatal webhook registration error:", e));
}

export function shutdownTelegramBot() {
  console.log("[Bot] Webhook mode — no cleanup needed");
}
