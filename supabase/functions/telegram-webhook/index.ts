/**
 * Supabase Edge Function: telegram-webhook
 *
 * Unified Telegram webhook handler for @rtrader_mobapp_bot.
 * Handles:
 *   1. Bot commands from users: /start, /subscribe, /status, /help, /approve, /reject
 *   2. Callback queries (inline button presses)
 *   3. Channel posts from VIP Telegram channel → saved to Supabase posts table
 *
 * Architecture (PROFITKING pattern):
 *   Telegram → Webhook → Supabase Edge Function → PostgreSQL → Realtime → App
 *
 * NO Railway. NO long-polling. Everything goes through Supabase directly.
 *
 * Environment variables required:
 *   - TELEGRAM_BOT_TOKEN
 *   - TELEGRAM_WEBHOOK_SECRET
 *   - SUPABASE_URL (auto-injected)
 *   - SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *   - ADMIN_IDS (comma-separated numeric Telegram IDs)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_API = "https://api.telegram.org";
const ANALYTICS_CHAT_ID = "chat-7";
const SYSTEM_USER_ID = "54f65c59-e7b3-43f2-89d9-201344bab730";

const PLANS = [
  { id: "week",     name: "1 неделя",  price: 1700,  days: 7,   label: "1 700 ₽/нед" },
  { id: "month",    name: "1 месяц",   price: 4000,  days: 30,  label: "4 000 ₽/мес" },
  { id: "quarter",  name: "3 месяца",  price: 10300, days: 90,  label: "10 300 ₽ (скидка 14%)" },
  { id: "halfyear", name: "Полгода",   price: 20000, days: 180, label: "20 000 ₽ (скидка 17%)" },
];

const PAYMENT = { bank: "Т-Банк", card: "5536 9138 8189 0954", name: "Зерянский Роман Олегович" };

// ─── Telegram helpers ────────────────────────────────────────────────────────

async function callTg(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) console.error(`[Bot] ${method} error:`, data.description);
  return data;
}

async function sendMsg(token: string, chatId: number, text: string, extra?: Record<string, unknown>) {
  return callTg(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

// ─── Pending payments (persisted in Supabase) ────────────────────────────────

async function savePendingPayment(
  supabase: ReturnType<typeof createClient>,
  telegramId: number,
  plan: { id: string; name: string; price: number; days: number }
) {
  await supabase.from("pending_payments").upsert({
    telegram_id: telegramId,
    plan_id: plan.id,
    plan_name: plan.name,
    price: plan.price,
    days: plan.days,
    updated_at: new Date().toISOString(),
  }, { onConflict: "telegram_id" });
}

async function getPendingPayment(
  supabase: ReturnType<typeof createClient>,
  telegramId: number
) {
  const { data } = await supabase
    .from("pending_payments")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();
  return data;
}

async function deletePendingPayment(
  supabase: ReturnType<typeof createClient>,
  telegramId: number
) {
  await supabase.from("pending_payments").delete().eq("telegram_id", telegramId);
}

// ─── Bot handlers ────────────────────────────────────────────────────────────

async function showMainMenu(token: string, chatId: number, firstName: string) {
  await sendMsg(token, chatId,
    `👋 Привет, <b>${firstName}</b>!\n\n🚀 <b>RTrader VIP-клуб</b> — закрытое сообщество трейдеров.\n\nВыберите действие:`,
    { reply_markup: { inline_keyboard: [
      [{ text: "💳 Оформить подписку", callback_data: "subscribe" }],
      [{ text: "📊 Мой статус", callback_data: "status" }],
      [{ text: "❓ Помощь", callback_data: "help" }],
    ]}}
  );
}

async function showTariffMenu(token: string, chatId: number) {
  const buttons = PLANS.map((p) => [{ text: p.label, callback_data: `plan_${p.id}` }]);
  buttons.push([{ text: "⬅️ Назад", callback_data: "home" }]);
  await sendMsg(token, chatId, "💳 <b>Выберите тариф:</b>", { reply_markup: { inline_keyboard: buttons } });
}

async function handlePlanSelected(
  token: string,
  chatId: number,
  telegramId: number,
  planId: string,
  supabase: ReturnType<typeof createClient>
) {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) { await sendMsg(token, chatId, "❌ Тариф не найден."); return; }
  await savePendingPayment(supabase, telegramId, plan);
  await sendMsg(token, chatId,
    `✅ Вы выбрали: <b>${plan.name}</b> — ${plan.label}\n\n` +
    `💳 <b>Реквизиты для оплаты:</b>\nБанк: ${PAYMENT.bank}\nКарта: <code>${PAYMENT.card}</code>\nПолучатель: ${PAYMENT.name}\nСумма: <b>${plan.price} ₽</b>\n\n` +
    `📸 После оплаты отправьте скриншот чека в этот чат.`,
    { reply_markup: { inline_keyboard: [[{ text: "⬅️ Назад к тарифам", callback_data: "subscribe" }]] } }
  );
}

async function handleStatus(token: string, chatId: number) {
  await sendMsg(token, chatId, `📊 <b>Статус подписки</b>\n\nДля проверки войдите в приложение RTrader.\nЕсли нет аккаунта — оформите подписку через /start`);
}

async function handleHelp(token: string, chatId: number) {
  await sendMsg(token, chatId, `/start — главное меню\n/subscribe — оформить подписку\n/status — статус\n\nПо вопросам: @rhodes4ever`);
}

async function handleReceipt(
  token: string,
  update: TelegramUpdate,
  adminIds: number[],
  supabase: ReturnType<typeof createClient>
) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name;
  const pending = await getPendingPayment(supabase, telegramId);

  if (!pending) {
    await sendMsg(token, chatId, `📸 Получили ваш чек!\n\nНо мы не нашли активный заказ. Сначала выберите тариф через /start`);
    return;
  }

  await sendMsg(token, chatId, `✅ Чек получен! Ожидайте подтверждения от администратора.`);

  const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document?.file_id;
  const adminText =
    `💰 <b>Новая заявка на подписку</b>\n\n` +
    `👤 ${firstName} (ID: <code>${telegramId}</code>)\n` +
    `📦 ${pending.plan_name} — ${pending.price} ₽ / ${pending.days} дней\n\n` +
    `✅ Одобрить: /approve_${telegramId}_${pending.plan_id}\n` +
    `❌ Отклонить: /reject_${telegramId}`;

  for (const adminId of adminIds) {
    try {
      if (fileId && msg.photo) {
        await callTg(token, "sendPhoto", { chat_id: adminId, photo: fileId, caption: adminText, parse_mode: "HTML" });
      } else if (fileId && msg.document) {
        await callTg(token, "sendDocument", { chat_id: adminId, document: fileId, caption: adminText, parse_mode: "HTML" });
      } else {
        await sendMsg(token, adminId, adminText);
      }
    } catch (e) {
      console.error(`[Bot] Failed to notify admin ${adminId}:`, e);
    }
  }
}

// ─── Approve/Reject (direct Supabase, no Railway) ────────────────────────────

// Generate random password for user account (not transmitted in deep link)
function generatePassword(length: number): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate one-time authentication token (expires in 15 minutes)
async function generateAuthToken(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const { data, error } = await supabase
    .from("auth_tokens")
    .insert({
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (error || !data?.token) {
    throw new Error(`Failed to generate auth token: ${error?.message || "unknown"}`);
  }

  return data.token;
}

async function handleApprove(
  token: string,
  update: TelegramUpdate,
  adminIds: number[],
  supabase: ReturnType<typeof createClient>
) {
  const msg = update.message!;
  const senderId = msg.from.id;
  const chatId = msg.chat.id;

  if (!adminIds.includes(senderId)) {
    await sendMsg(token, chatId, "❌ Нет прав.");
    return;
  }

  // Parse /approve_<telegram_id>_<plan_id>
  const match = msg.text?.match(/\/approve_(\d+)_(\w+)/);
  if (!match) {
    await sendMsg(token, chatId, "❌ Формат: /approve_<telegram_id>_<plan_id>");
    return;
  }

  const targetTelegramId = parseInt(match[1]);
  const planId = match[2];
  const plan = PLANS.find((p) => p.id === planId);
  const days = plan?.days ?? 30;

  await sendMsg(token, chatId, `⏳ Создаю аккаунт для пользователя ${targetTelegramId}...`);

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.user_metadata?.telegram_id === String(targetTelegramId)
    );

    let userId: string;
    let deepLink: string;

    if (existingUser) {
      // Renew subscription
      userId = existingUser.id;
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: planId,
        status: "active",
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });
      const authToken = await generateAuthToken(supabase, userId);
      deepLink = `rtrader://login?token=${authToken}`;
      await sendMsg(token, chatId, `✅ Подписка продлена для ${targetTelegramId}\nДо: ${expiresAt.toLocaleDateString("ru-RU")}`);
    } else {
      // Create new user
      const email = `tg${targetTelegramId}@rtrader.app`;
      const password = generatePassword(12);

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { telegram_id: String(targetTelegramId), email_verified: true },
      });

      if (authError || !authData.user) {
        await sendMsg(token, chatId, `❌ Ошибка создания аккаунта: ${authError?.message || "unknown"}`);
        return;
      }

      userId = authData.user.id;
      await supabase.from("profiles").upsert({ id: userId, username: `user_${targetTelegramId}` });
      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan: planId,
        status: "active",
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      const authToken = await generateAuthToken(supabase, userId);
      deepLink = `rtrader://login?token=${authToken}`;
      await sendMsg(token, chatId, `✅ Аккаунт создан для ${targetTelegramId}\nДо: ${expiresAt.toLocaleDateString("ru-RU")}`);
    }

    // Delete pending payment
    await deletePendingPayment(supabase, targetTelegramId);

    // Send one-time token link to user
    await sendMsg(token, targetTelegramId,
      `🎉 <b>Ваша подписка активирована!</b>\n\n` +
      `Нажмите кнопку ниже для входа в приложение RTrader:`,
      { reply_markup: { inline_keyboard: [[{ text: "🚀 Войти в приложение", url: deepLink }]] } }
    );

    console.log(`[Bot] Auth token sent to user ${targetTelegramId}`);

  } catch (e: any) {
    console.error("[Bot] approve error:", e);
    await sendMsg(token, chatId, `❌ Ошибка: ${e.message}`);
  }
}


async function handleReject(
  token: string,
  update: TelegramUpdate,
  adminIds: number[],
  supabase: ReturnType<typeof createClient>
) {
  const msg = update.message!;
  const senderId = msg.from.id;
  const chatId = msg.chat.id;

  if (!adminIds.includes(senderId)) {
    await sendMsg(token, chatId, "❌ Нет прав.");
    return;
  }

  const match = msg.text?.match(/\/reject_(\d+)/);
  if (!match) {
    await sendMsg(token, chatId, "❌ Формат: /reject_<telegram_id>");
    return;
  }

  const targetTelegramId = parseInt(match[1]);
  await deletePendingPayment(supabase, targetTelegramId);
  await sendMsg(token, targetTelegramId,
    `❌ <b>Ваша заявка отклонена.</b>\n\nЕсли у вас есть вопросы, обратитесь к @rhodes4ever`
  );
  await sendMsg(token, chatId, `✅ Заявка ${targetTelegramId} отклонена.`);
}

// ─── Channel post handler ────────────────────────────────────────────────────

async function handleChannelPost(
  post: TelegramMessage,
  token: string,
  supabase: ReturnType<typeof createClient>
) {
  const content = post.text || post.caption || "";
  const messageId = post.message_id;

  let mediaType: string | null = null;
  let mediaUrl: string | null = null;
  let fileId: string | null = null;

  if (post.photo?.length) {
    mediaType = "image";
    fileId = post.photo[post.photo.length - 1].file_id;
    try { mediaUrl = await downloadAndUpload(token, fileId, messageId, supabase); } catch (e) { console.error("[Bot] photo upload:", e); }
  } else if (post.video) {
    mediaType = "video";
    fileId = post.video.file_id;
  } else if (post.document) {
    mediaType = "file";
    fileId = post.document.file_id;
  }

  await supabase.from("posts").upsert({
    chat_id: ANALYTICS_CHAT_ID,
    content,
    media_type: mediaType,
    media_url: mediaUrl,
    file_id: fileId,
    source: "telegram",
    telegram_message_id: messageId,
    author_name: "RTrader Аналитика",
    created_at: new Date(post.date * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "telegram_message_id" });
}

async function downloadAndUpload(
  token: string,
  fileId: string,
  messageId: number,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const fi = await (await fetch(`${TELEGRAM_API}/bot${token}/getFile?file_id=${fileId}`)).json();
  if (!fi.ok) throw new Error(`getFile failed: ${JSON.stringify(fi)}`);
  const fileRes = await fetch(`${TELEGRAM_API}/file/bot${token}/${fi.result.file_path}`);
  if (!fileRes.ok) throw new Error(`Download failed: ${fileRes.status}`);
  const buf = await fileRes.arrayBuffer();
  const name = `channel-posts/${messageId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("media").upload(name, buf, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("media").getPublicUrl(name).data.publicUrl;
}

// ─── Main ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (webhookSecret && req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== webhookSecret) {
    console.error("Invalid webhook secret");
    return new Response("Unauthorized", { status: 401 });
  }

  let update: TelegramUpdate;
  try { update = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const adminIds = (Deno.env.get("ADMIN_IDS") || "716116024")
    .split(",").map((s) => parseInt(s.trim())).filter(Boolean);

  try {
    // Channel post → save to posts table
    if (update.channel_post) {
      await handleChannelPost(update.channel_post, token, supabase);
      return new Response("OK");
    }

    // Text messages
    if (update.message?.text) {
      const { text, chat: { id: chatId }, from: { first_name } } = update.message;
      if (text.startsWith("/start")) await showMainMenu(token, chatId, first_name);
      else if (text === "/subscribe") await showTariffMenu(token, chatId);
      else if (text === "/status") await handleStatus(token, chatId);
      else if (text === "/help") await handleHelp(token, chatId);
      else if (text.startsWith("/approve_")) await handleApprove(token, update, adminIds, supabase);
      else if (text.startsWith("/reject_")) await handleReject(token, update, adminIds, supabase);
      else await sendMsg(token, chatId, `❓ Неизвестная команда. Используйте /start`);
      return new Response("OK");
    }

    // Photo or document → receipt
    if (update.message?.photo || update.message?.document) {
      await handleReceipt(token, update, adminIds, supabase);
      return new Response("OK");
    }

    // Callback queries (button presses)
    if (update.callback_query) {
      const { id: qid, from: { id: chatId, first_name }, data } = update.callback_query;
      await callTg(token, "answerCallbackQuery", { callback_query_id: qid });
      if (data === "home") await showMainMenu(token, chatId, first_name);
      else if (data === "subscribe") await showTariffMenu(token, chatId);
      else if (data === "status") await handleStatus(token, chatId);
      else if (data === "help") await handleHelp(token, chatId);
      else if (data.startsWith("plan_")) {
        await handlePlanSelected(token, chatId, chatId, data.replace("plan_", ""), supabase);
      }
      return new Response("OK");
    }

    return new Response("OK");
  } catch (e) {
    console.error("[Bot] Error:", e);
    return new Response("Internal error", { status: 500 });
  }
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramMessage;
  message?: TelegramMessage;
  callback_query?: { id: string; from: { id: number; first_name: string }; data: string };
}
interface TelegramMessage {
  message_id: number; date: number;
  from: { id: number; is_bot: boolean; first_name: string; username?: string };
  chat: { id: number; type: string };
  text?: string; caption?: string;
  photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }>;
  video?: { file_id: string; file_unique_id: string; width: number; height: number; duration: number };
  document?: { file_id: string; file_unique_id: string; file_name?: string; mime_type?: string };
}
