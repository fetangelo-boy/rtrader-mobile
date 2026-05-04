/**
 * Supabase Edge Function: telegram-webhook
 *
 * Unified Telegram webhook handler for @rtrader_mobapp_bot.
 * Handles:
 *   1. Bot commands from users: /start, /subscribe, /status, /help, /approve, /reject
 *   2. Callback queries (inline button presses)
 *   3. Channel posts from VIP Telegram channel → saved to Supabase messages table
 *
 * Architecture (PROFITKING pattern):
 *   Telegram → Webhook → Supabase Edge Function → PostgreSQL → Realtime → App
 *
 * Environment variables required:
 *   - TELEGRAM_BOT_TOKEN
 *   - TELEGRAM_WEBHOOK_SECRET
 *   - SUPABASE_URL (auto-injected)
 *   - SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *   - SERVER_URL (Railway/Koyeb URL for approve endpoint)
 *   - ADMIN_IDS (comma-separated numeric Telegram IDs)
 *   - ADMIN_API_KEY (for approve endpoint auth)
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

// Stateless pending map — best-effort within same Edge Function instance
const pendingPayments = new Map<number, { planId: string; planName: string; price: number; days: number }>();

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

async function handlePlanSelected(token: string, chatId: number, telegramId: number, planId: string) {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) { await sendMsg(token, chatId, "❌ Тариф не найден."); return; }
  pendingPayments.set(telegramId, { planId: plan.id, planName: plan.name, price: plan.price, days: plan.days });
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

async function handleReceipt(token: string, update: TelegramUpdate, adminIds: number[]) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name;
  const pending = pendingPayments.get(telegramId);

  if (!pending) {
    await sendMsg(token, chatId, `📸 Получили ваш чек!\n\nНо мы не нашли активный заказ. Сначала выберите тариф через /start`);
    return;
  }

  await sendMsg(token, chatId, `✅ Чек получен! Ожидайте подтверждения от администратора.`);

  const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document?.file_id;
  const adminText =
    `💰 <b>Новая заявка на подписку</b>\n\n` +
    `👤 ${firstName} (ID: <code>${telegramId}</code>)\n` +
    `📦 ${pending.planName} — ${pending.price} ₽ / ${pending.days} дней\n\n` +
    `✅ Одобрить: /approve_${telegramId}_${pending.planId}\n` +
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
    } catch (e) { console.error(`[Bot] Failed to notify admin ${adminId}:`, e); }
  }
}

async function handleApprove(token: string, update: TelegramUpdate, adminIds: number[], serverUrl: string) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  if (!adminIds.includes(msg.from.id)) { await sendMsg(token, chatId, "❌ Нет прав."); return; }

  const parts = msg.text!.replace("/approve_", "").split("_");
  const telegramId = parseInt(parts[0]);
  const planId = parts[1] || "month";
  if (isNaN(telegramId)) { await sendMsg(token, chatId, "❌ Формат: /approve_<telegramId>_<planId>"); return; }

  const plan = PLANS.find((p) => p.id === planId) || PLANS[1];

  try {
    const response = await fetch(`${serverUrl}/api/admin/approve-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": Deno.env.get("ADMIN_API_KEY") || "" },
      body: JSON.stringify({ telegram_id: telegramId, plan_id: planId, days: plan.days }),
    });
    const data = await response.json();
    if (!response.ok) { await sendMsg(token, chatId, `❌ Ошибка: ${data.error}`); return; }

    const deepLink = data.deepLink || `rtrader://auth/telegram?token=${data.token}`;
    await callTg(token, "sendMessage", {
      chat_id: telegramId,
      text: `✅ <b>Подписка активирована!</b>\n\nТариф: ${plan.name} (${plan.days} дней)\n\nНажмите кнопку для входа:`,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "🚀 Войти в RTrader", url: deepLink }]] },
    });
    await sendMsg(token, chatId, `✅ Подписка одобрена для ${telegramId}`);
    pendingPayments.delete(telegramId);
  } catch (e) {
    console.error("[Bot] approve error:", e);
    await sendMsg(token, chatId, `❌ Ошибка: ${e}`);
  }
}

async function handleReject(token: string, update: TelegramUpdate, adminIds: number[]) {
  const msg = update.message!;
  const chatId = msg.chat.id;
  if (!adminIds.includes(msg.from.id)) { await sendMsg(token, chatId, "❌ Нет прав."); return; }

  const telegramId = parseInt(msg.text!.replace("/reject_", ""));
  if (isNaN(telegramId)) { await sendMsg(token, chatId, "❌ Формат: /reject_<telegramId>"); return; }

  await sendMsg(token, telegramId, `❌ <b>Заявка отклонена</b>\n\nПо вопросам: @rhodes4ever`);
  await sendMsg(token, chatId, `✅ Заявка ${telegramId} отклонена`);
  pendingPayments.delete(telegramId);
}

// ─── Channel post handler ────────────────────────────────────────────────────

async function handleChannelPost(post: TelegramMessage, token: string, supabase: ReturnType<typeof createClient>) {
  const { data: existing } = await supabase.from("messages").select("id")
    .eq("tg_msg_id", post.message_id).eq("chat_id", ANALYTICS_CHAT_ID).maybeSingle();
  if (existing) { console.log(`Duplicate ${post.message_id}, skip`); return; }

  const textContent = post.text || post.caption || "";
  let mediaType: "photo" | "video" | "document" | null = null;
  let mediaUrl: string | null = null;
  let fileId: string | null = null;

  if (post.photo?.length) {
    mediaType = "photo";
    fileId = post.photo[post.photo.length - 1].file_id;
    try { mediaUrl = await downloadAndStorePhoto(token, fileId, supabase, post.message_id); }
    catch (err) { console.error("Photo store failed:", err); }
  } else if (post.video) {
    mediaType = "video"; fileId = post.video.file_id;
  } else if (post.document) {
    mediaType = "document"; fileId = post.document.file_id;
  }

  if (!textContent && !mediaType) { console.log("Empty post, skip"); return; }

  const { error } = await supabase.from("messages").insert({
    id: `tg-${post.message_id}-${Date.now()}`,
    chat_id: ANALYTICS_CHAT_ID,
    user_id: SYSTEM_USER_ID,
    content: textContent || `[${mediaType}]`,
    media_type: mediaType, media_url: mediaUrl, file_id: fileId,
    tg_msg_id: post.message_id,
    created_at: new Date(post.date * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("Insert failed:", error);
  else console.log(`✅ Saved channel post ${post.message_id}`);
}

async function downloadAndStorePhoto(token: string, fileId: string, supabase: ReturnType<typeof createClient>, messageId: number): Promise<string> {
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
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const serverUrl = Deno.env.get("SERVER_URL") || "https://rtrader-server-production.up.railway.app";
  const adminIds = (Deno.env.get("ADMIN_IDS") || "716116024").split(",").map((s) => parseInt(s.trim())).filter(Boolean);

  try {
    if (update.channel_post) { await handleChannelPost(update.channel_post, token, supabase); return new Response("OK"); }

    if (update.message?.text) {
      const { text, chat: { id: chatId }, from: { first_name } } = update.message;
      if (text.startsWith("/start")) await showMainMenu(token, chatId, first_name);
      else if (text === "/subscribe") await showTariffMenu(token, chatId);
      else if (text === "/status") await handleStatus(token, chatId);
      else if (text === "/help") await handleHelp(token, chatId);
      else if (text.startsWith("/approve")) await handleApprove(token, update, adminIds, serverUrl);
      else if (text.startsWith("/reject")) await handleReject(token, update, adminIds);
      else await sendMsg(token, chatId, `❓ Неизвестная команда. Используйте /start`);
      return new Response("OK");
    }

    if (update.message?.photo || update.message?.document) {
      await handleReceipt(token, update, adminIds);
      return new Response("OK");
    }

    if (update.callback_query) {
      const { id: qid, from: { id: chatId, first_name }, data } = update.callback_query;
      await callTg(token, "answerCallbackQuery", { callback_query_id: qid });
      if (data === "home") await showMainMenu(token, chatId, first_name);
      else if (data === "subscribe") await showTariffMenu(token, chatId);
      else if (data === "status") await handleStatus(token, chatId);
      else if (data === "help") await handleHelp(token, chatId);
      else if (data.startsWith("plan_")) await handlePlanSelected(token, chatId, chatId, data.replace("plan_", ""));
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
