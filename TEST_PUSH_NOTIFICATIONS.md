# Push Notifications Testing Guide

**Status:** ✅ Infrastructure ready  
**Test Date:** 2026-05-01

---

## Pre-Test Checklist

- [x] Push notifications hook implemented
- [x] Backend router configured
- [x] Database table created (push_tokens)
- [x] Supabase RLS policies set
- [x] Expo project configured

---

## Step 1: Install and Login to App

1. Install APK on Android device
2. Tap "Получить доступ через Telegram"
3. Open @rtrader_mobapp_bot
4. Send `/start`
5. Create account and get credentials
6. Login to app

---

## Step 2: Verify Token Registration

After login, check if push token was registered:

### Via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select project: vfxezndvkaxlimthkeyx
3. Go to "SQL Editor"
4. Run query:
   ```sql
   SELECT * FROM push_tokens 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
5. Should see entry with:
   - `user_id`: Your user UUID
   - `token`: ExponentPushToken[...]
   - `platform`: "android"
   - `is_active`: true

### Via App Logs

```bash
# Connect device and check logs
adb logcat | grep "Push Notifications"

# Should see:
# [Push Notifications] Token: ExponentPushToken[...]
# [Push Notifications] Token registered successfully
```

---

## Step 3: Send Test Notification

### Method 1: Using Expo Push API (Recommended)

```bash
# Get token from push_tokens table
TOKEN="ExponentPushToken[...]"

# Send test notification
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d "{
    \"to\": \"$TOKEN\",
    \"sound\": \"default\",
    \"title\": \"RTrader Test\",
    \"body\": \"This is a test notification\",
    \"data\": {
      \"chatId\": \"test-chat-1\",
      \"screen\": \"chat\"
    },
    \"badge\": 1
  }"
```

### Method 2: Using Node.js Script

```javascript
// test-push.js
const axios = require('axios');

const token = 'ExponentPushToken[...]'; // From push_tokens table

const message = {
  to: token,
  sound: 'default',
  title: 'RTrader Test',
  body: 'This is a test notification',
  data: {
    chatId: 'test-chat-1',
    screen: 'chat'
  },
  badge: 1
};

axios.post('https://exp.host/--/api/v2/push/send', message)
  .then(res => {
    console.log('Response:', res.data);
    if (res.data.data && res.data.data[0].status === 'ok') {
      console.log('✅ Notification sent successfully!');
      console.log('Ticket ID:', res.data.data[0].id);
    } else {
      console.log('❌ Failed:', res.data);
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
```

Run with:
```bash
node test-push.js
```

---

## Step 4: Verify Notification Delivery

### Check Device

1. Keep app in foreground
2. Should see notification banner at top
3. Or check notification center (pull down from top)

### Expected Behavior

- **App in foreground:** Notification banner appears
- **App in background:** Notification in notification center
- **App closed:** Notification in notification center

### Check Logs

```bash
adb logcat | grep "Notification"

# Should see:
# [Notification Received] notification: {...}
# [Notification Response] response: {...}
```

---

## Step 5: Test Notification Response

When user taps notification:

1. App should navigate to chat screen (if chatId provided)
2. Check logs for navigation event
3. Verify chat opens correctly

---

## Troubleshooting

### Token Not Registered

**Symptom:** push_tokens table is empty after login

**Solution:**
1. Check app logs: `adb logcat | grep "Push Notifications"`
2. Verify permission granted: Settings → Apps → RTrader → Permissions → Notifications
3. Check internet connectivity
4. Restart app

### Notification Not Delivered

**Symptom:** Token exists but notification doesn't arrive

**Solution:**
1. Verify token format: Should start with `ExponentPushToken[`
2. Check Expo API response for errors
3. Verify device has Google Play Services
4. Check notification permission is granted
5. Try with different token

### Notification Arrives But App Doesn't Navigate

**Symptom:** Notification received but doesn't open chat

**Solution:**
1. Check notification data includes `chatId`
2. Verify chat exists in database
3. Check app logs for navigation errors
4. Verify deep link configuration

---

## Production Deployment

After testing locally:

1. **Enable notifications in app:**
   - Already enabled by default
   - Users can disable per-chat via mute

2. **Set up notification broadcasting:**
   - Implement `notifications.sendBatch` endpoint
   - Call when new messages arrive in chat
   - Send to all subscribers of that chat

3. **Monitor delivery:**
   - Check Expo Push API response codes
   - Log failed deliveries
   - Monitor notification open rates

---

## Expected Results

| Test | Expected | Status |
|------|----------|--------|
| Token registration | Token in push_tokens table | ✅ |
| Notification send | Expo API returns success | ⏳ |
| Notification receive | Notification appears on device | ⏳ |
| Notification tap | App navigates to chat | ⏳ |

---

## Notes

- Push notifications require physical device (not emulator)
- Requires Google Play Services on device
- Requires internet connectivity
- Tokens expire after ~30 days (auto-refresh)
- Notifications work even if app is closed

---

**Test prepared:** 2026-05-01  
**Status:** ✅ Ready to test
