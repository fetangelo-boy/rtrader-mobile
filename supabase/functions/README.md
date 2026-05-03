# Supabase Edge Functions

## Functions

### `telegram-webhook`
Receives Telegram channel posts and saves them to the `messages` table (chat-7 "Аналитика").

**Architecture:**
```
Telegram VIP Channel → Webhook → telegram-webhook → messages table → Realtime → App
```

### `media-proxy`
Resolves Telegram `file_id` to a temporary download URL for video playback.

---

## Deployment

### Prerequisites
Install Supabase CLI:
```bash
npm install -g supabase
supabase login
```

### Deploy functions
```bash
cd /path/to/rtrader-mobile

# Deploy telegram-webhook
supabase functions deploy telegram-webhook --project-ref vfxezndvkaxlimthkeyx

# Deploy media-proxy
supabase functions deploy media-proxy --project-ref vfxezndvkaxlimthkeyx
```

### Set environment variables
```bash
# Set Telegram bot token
supabase secrets set TELEGRAM_BOT_TOKEN=8749763017:AAH5QuhuaWEI8nkpwyv_bE9rUTewjClNmck --project-ref vfxezndvkaxlimthkeyx

# Set webhook secret (generate a random string)
supabase secrets set TELEGRAM_WEBHOOK_SECRET=your_random_secret_here --project-ref vfxezndvkaxlimthkeyx
```

### Register Telegram Webhook
After deploying, register the webhook with Telegram:
```
https://api.telegram.org/bot8749763017:AAH5QuhuaWEI8nkpwyv_bE9rUTewjClNmck/setWebhook?url=https://vfxezndvkaxlimthkeyx.supabase.co/functions/v1/telegram-webhook&secret_token=your_random_secret_here
```

### Add bot to Telegram channel
1. Open the VIP channel in Telegram
2. Settings → Administrators → Add Administrator
3. Find `@rtrader_mobapp_bot`
4. Grant only: **Read Messages** (or "View Messages")
5. Save

---

## Supabase Storage Setup

Create a public bucket named `media` for storing channel photos:
1. Go to Supabase Dashboard → Storage
2. Create bucket: `media`
3. Set to **Public**
4. Add policy: Allow all reads (public), allow service role writes

---

## Testing

Test the webhook locally:
```bash
supabase functions serve telegram-webhook --env-file .env.local

# Send a test update
curl -X POST http://localhost:54321/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 1,
    "channel_post": {
      "message_id": 999,
      "date": 1746000000,
      "text": "Test post from VIP channel 🚀"
    }
  }'
```
