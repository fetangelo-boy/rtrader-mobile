# Telegram Bot Setup & Testing Guide

**Bot:** @rtrader_mobapp_bot  
**Token:** Configured ✅  
**Webhook:** Ready to set up  
**Status:** Ready for testing

---

## What the Bot Does

1. **User Recognition** (`/start`)
   - Checks if user already has subscription
   - If active: generates login link
   - If expired: shows renewal options
   - If new: shows subscription options

2. **Subscription Management**
   - Shows pricing (99 RUB/month)
   - Directs users to admin for payment
   - Generates deep link after payment

3. **Auto-Login Flow**
   - Bot generates JWT token
   - Creates deep link: `rtrader://login?email=...&password=...`
   - User taps link → app auto-logs in

---

## Setup Steps

### Step 1: Set Webhook URL

The webhook endpoint needs to be set on Telegram's servers. Use this command:

```bash
curl -X POST https://api.telegram.org/bot8749763017:AAH5QuhuaWEI8nkpwyv_bE9rUTewjClNmck/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "drop_pending_updates": true
  }'
```

**Replace:** `https://your-domain.com` with your actual backend URL

**Expected response:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Step 2: Verify Webhook

Check if webhook is set correctly:

```bash
curl https://api.telegram.org/bot8749763017:AAH5QuhuaWEI8nkpwyv_bE9rUTewjClNmck/getWebhookInfo
```

**Expected response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "...",
    "last_error_date": 0,
    "max_connections": 40
  }
}
```

---

## Testing the Bot

### Test 1: Send /start Command

1. Open Telegram
2. Search for: @rtrader_mobapp_bot
3. Send: `/start`

**Expected response:**
- If new user: Shows subscription options with buttons
- If existing user: Shows login link or renewal option

### Test 2: Click Subscription Button

1. Click "💳 Оплатить подписку" button
2. Bot should show payment instructions

**Expected response:**
```
💳 Оплата подписки

Стоимость: 99 RUB/месяц

Для оплаты свяжитесь с администратором:
@rhodes4ever

После оплаты администратор активирует вашу подписку.
```

### Test 3: Test Auto-Login

After admin activates subscription:

1. Send `/start` again to bot
2. Bot generates login link
3. Click "📱 Открыть RTrader" button
4. App should auto-login

---

## User Flow: Complete Journey

### For New User

```
User: /start
↓
Bot: Shows welcome + subscription options
↓
User: Clicks "💳 Оплатить подписку"
↓
Bot: Shows admin contact (@rhodes4ever)
↓
User: Pays via admin
↓
Admin: Activates subscription via API
↓
User: /start again
↓
Bot: Generates login link
↓
User: Clicks "📱 Открыть RTrader"
↓
App: Auto-logs in with JWT token
↓
User: Sees chat list ✅
```

### For Existing User

```
User: /start
↓
Bot: Checks subscription status
↓
Bot: Generates login link (if active)
↓
User: Clicks "📱 Открыть RTrader"
↓
App: Auto-logs in ✅
```

---

## API Endpoints

### Webhook Endpoint
```
POST /api/telegram/webhook
```
Receives updates from Telegram. Automatically processes:
- `/start` command
- Button clicks (callback queries)

### Set Webhook
```
POST /api/telegram/set-webhook
Body: { "url": "https://your-domain.com" }
```

### Get Webhook Info
```
GET /api/telegram/webhook-info
```

---

## Troubleshooting

### Bot doesn't respond to /start

**Check:**
1. Webhook URL is correct
2. Webhook is set: `GET /api/telegram/webhook-info`
3. Server is running and accessible
4. BOT_TOKEN is set in environment

**Solution:**
```bash
# Re-set webhook
curl -X POST https://api.telegram.org/bot8749763017:AAH5QuhuaWEI8nkpwyv_bE9rUTewjClNmck/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'

# Check logs
tail -f /var/log/app.log | grep "\[Bot\]"
```

### Deep link doesn't open app

**Check:**
1. App scheme is configured: `rtrader://`
2. Deep link format is correct
3. App is installed on device

**Solution:**
- Verify `app.config.ts` has correct scheme
- Test deep link manually: `adb shell am start -W -a android.intent.action.VIEW -d "rtrader://login?email=test@example.com&password=token123"`

### User not found error

**Cause:** User doesn't have subscription yet

**Solution:**
- Admin must create subscription via API
- Or user must complete payment flow first

---

## Admin Commands (via API)

### Create User + Subscription

```bash
curl -X POST http://localhost:3000/api/admin/create-subscriber \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "telegram_id": "123456789",
    "telegram_name": "Иван Петров",
    "email": "ivan@example.com",
    "plan": "premium",
    "days": 30
  }'
```

### Check Subscription Status

```bash
curl "http://localhost:3000/api/admin/subscriber-status?telegram_id=123456789" \
  -H "X-Admin-Key: your-admin-key"
```

---

## Testing Instructions for QA

### Prerequisite
- APK installed on Android device
- Telegram app installed

### Test Case 1: New User Registration

1. Open @rtrader_mobapp_bot
2. Send `/start`
3. Verify: Bot shows welcome message
4. Verify: Bot shows "💳 Оплатить подписку" button
5. Click button
6. Verify: Bot shows payment instructions

**Expected:** ✅ All steps work

### Test Case 2: Auto-Login After Payment

1. Admin creates subscription for test user
2. Open @rtrader_mobapp_bot
3. Send `/start`
4. Verify: Bot shows "📱 Открыть RTrader" button
5. Click button
6. Verify: App opens and auto-logs in
7. Verify: Chat list is visible

**Expected:** ✅ Auto-login works

### Test Case 3: Subscription Expired

1. Admin expires user's subscription
2. Open @rtrader_mobapp_bot
3. Send `/start`
4. Verify: Bot shows "⏰ Подписка истекла"
5. Verify: Bot shows admin contact

**Expected:** ✅ Expired status shown

### Test Case 4: Help Command

1. Open @rtrader_mobapp_bot
2. Click "❓ Помощь" button
3. Verify: Bot shows help information

**Expected:** ✅ Help info displayed

---

## Monitoring

### Check Bot Logs

```bash
# View recent bot activity
tail -100 /var/log/app.log | grep "\[Bot\]"

# Monitor in real-time
tail -f /var/log/app.log | grep "\[Bot\]"
```

### Expected Log Entries

```
[Bot] /start from Ivan (123456789)
[Bot] Callback: subscribe_premium from Ivan (123456789)
[Bot] Setting webhook to: https://your-domain.com/api/telegram/webhook
[Bot] Webhook set successfully
```

---

## Next Steps

1. **Set webhook URL** on your production domain
2. **Test bot** with /start command
3. **Create test subscription** for QA user
4. **Test auto-login** flow
5. **Monitor logs** for errors

---

**Bot Status:** ✅ Ready to deploy  
**Last Updated:** 2026-05-01
