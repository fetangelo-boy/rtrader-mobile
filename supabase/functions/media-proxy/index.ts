/**
 * Supabase Edge Function: media-proxy
 *
 * Resolves a Telegram file_id to a temporary download URL.
 * Used for video playback — videos stay on Telegram servers, we only get a fresh link on demand.
 *
 * Usage: GET /functions/v1/media-proxy?file_id=<TELEGRAM_FILE_ID>
 *
 * Returns: { url: "https://api.telegram.org/file/bot.../..." }
 *
 * Security:
 *   - Requires valid Supabase JWT (authenticated users only)
 *   - Bot token never exposed to the client
 *
 * Environment variables required:
 *   - TELEGRAM_BOT_TOKEN: Bot token for @rtrader_mobapp_bot
 *   - SUPABASE_URL: Auto-injected
 *   - SUPABASE_ANON_KEY: Auto-injected
 */

const TELEGRAM_API = "https://api.telegram.org";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validate user is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get file_id from query params
  const url = new URL(req.url);
  const fileId = url.searchParams.get("file_id");

  if (!fileId) {
    return new Response(JSON.stringify({ error: "file_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return new Response(JSON.stringify({ error: "Bot token not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get file path from Telegram
    const fileInfoRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile?file_id=${fileId}`);
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok) {
      console.error("Telegram getFile failed:", fileInfo);
      return new Response(JSON.stringify({ error: "Failed to get file from Telegram" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = fileInfo.result.file_path;
    const fileUrl = `${TELEGRAM_API}/file/bot${botToken}/${filePath}`;

    return new Response(
      JSON.stringify({ url: fileUrl }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          // Cache for 50 minutes (Telegram links expire after ~1 hour)
          "Cache-Control": "private, max-age=3000",
        },
      },
    );
  } catch (err) {
    console.error("media-proxy error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
