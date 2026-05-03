/**
 * Supabase Edge Function: telegram-webhook
 *
 * Receives Telegram Webhook updates from the "Интрадей и мысли" VIP channel.
 * Saves each post as a message in the "Аналитика" chat (chat-7).
 *
 * Architecture: Telegram Channel → Webhook → Edge Function → Supabase messages table → Realtime → App
 *
 * Setup:
 *   1. Deploy this function: supabase functions deploy telegram-webhook
 *   2. Register webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FUNCTION_URL>&secret_token=<WEBHOOK_SECRET>
 *
 * Environment variables required:
 *   - TELEGRAM_BOT_TOKEN: Bot token for @rtrader_mobapp_bot
 *   - TELEGRAM_WEBHOOK_SECRET: Secret token to validate incoming requests
 *   - SUPABASE_URL: Auto-injected by Supabase
 *   - SUPABASE_SERVICE_ROLE_KEY: Auto-injected by Supabase
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Chat ID for "Аналитика" — the info_only channel that mirrors the Telegram VIP channel
const ANALYTICS_CHAT_ID = "chat-7";

// System user ID — used as author for bot-forwarded messages
// This is the "participant" role user in chat-7 (not a real subscriber)
const SYSTEM_USER_ID = "54f65c59-e7b3-43f2-89d9-201344bab730";

const TELEGRAM_API = "https://api.telegram.org";

Deno.serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validate webhook secret to prevent unauthorized requests
  const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (webhookSecret) {
    const incomingSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (incomingSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // We only care about channel posts (not regular messages)
  const post = update.channel_post;
  if (!post) {
    // Not a channel post — could be a regular message or other update, ignore silently
    return new Response("OK", { status: 200 });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);

  // Check for duplicate (same Telegram message ID)
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("tg_msg_id", post.message_id)
    .eq("chat_id", ANALYTICS_CHAT_ID)
    .maybeSingle();

  if (existing) {
    console.log(`Duplicate message ${post.message_id}, skipping`);
    return new Response("OK", { status: 200 });
  }

  // Extract text content (support both text and caption for media posts)
  const textContent = post.text || post.caption || "";

  // Determine media type and handle accordingly
  let mediaType: "photo" | "video" | "document" | null = null;
  let mediaUrl: string | null = null;
  let fileId: string | null = null;

  if (post.photo && post.photo.length > 0) {
    // Photo: take the largest size
    mediaType = "photo";
    const largestPhoto = post.photo[post.photo.length - 1];
    fileId = largestPhoto.file_id;

    // Download photo and upload to Supabase Storage for permanent URL
    if (botToken) {
      try {
        mediaUrl = await downloadAndStorePhoto(botToken, fileId, supabase, post.message_id);
      } catch (err) {
        console.error("Failed to store photo, will use file_id fallback:", err);
        // Keep fileId as fallback — media-proxy can resolve it later
      }
    }
  } else if (post.video) {
    // Video: store file_id only — resolved on-demand via media-proxy Edge Function
    mediaType = "video";
    fileId = post.video.file_id;
    // Note: we do NOT download video — it's streamed from Telegram on demand
  } else if (post.document) {
    // Document/file
    mediaType = "document";
    fileId = post.document.file_id;
  }

  // Skip empty posts (no text and no media)
  if (!textContent && !mediaType) {
    console.log("Empty post, skipping");
    return new Response("OK", { status: 200 });
  }

  // Insert message into Supabase
  const messageId = `tg-${post.message_id}-${Date.now()}`;
  const { error } = await supabase.from("messages").insert({
    id: messageId,
    chat_id: ANALYTICS_CHAT_ID,
    user_id: SYSTEM_USER_ID,
    content: textContent || `[${mediaType}]`,
    media_type: mediaType,
    media_url: mediaUrl,
    file_id: fileId,
    tg_msg_id: post.message_id,
    created_at: new Date(post.date * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to insert message:", error);
    return new Response("Internal error", { status: 500 });
  }

  console.log(`✅ Saved post ${post.message_id} to chat-7 (Аналитика)`);
  return new Response("OK", { status: 200 });
});

/**
 * Downloads a photo from Telegram and uploads it to Supabase Storage.
 * Returns the public URL of the stored photo.
 */
async function downloadAndStorePhoto(
  botToken: string,
  fileId: string,
  supabase: ReturnType<typeof createClient>,
  messageId: number,
): Promise<string> {
  // Step 1: Get file path from Telegram
  const fileInfoRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile?file_id=${fileId}`);
  const fileInfo = await fileInfoRes.json();

  if (!fileInfo.ok) {
    throw new Error(`Telegram getFile failed: ${JSON.stringify(fileInfo)}`);
  }

  const filePath = fileInfo.result.file_path;

  // Step 2: Download the file
  const fileRes = await fetch(`${TELEGRAM_API}/file/bot${botToken}/${filePath}`);
  if (!fileRes.ok) {
    throw new Error(`Failed to download file: ${fileRes.status}`);
  }

  const fileBuffer = await fileRes.arrayBuffer();
  const fileName = `channel-posts/${messageId}-${Date.now()}.jpg`;

  // Step 3: Upload to Supabase Storage bucket "media"
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(fileName, fileBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Step 4: Get public URL
  const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
  return urlData.publicUrl;
}

// TypeScript types for Telegram Update
interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramMessage;
  message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  document?: TelegramDocument;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}
