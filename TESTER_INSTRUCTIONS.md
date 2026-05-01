# RTrader Mobile APK — Tester Instructions

**Status:** ✅ Ready to test  
**APK Version:** 1.0.0  
**Bot:** @rtrader_mobapp_bot (restored)

---

## What You're Testing

RTrader mobile app with:
- ✅ User login via Telegram bot
- ✅ 12 community chats
- ✅ Real-time messaging
- ✅ Reply functionality
- ✅ Mute/unmute notifications
- ✅ Account management
- ✅ Push notifications (infrastructure ready)

---

## Installation

### 1. Download APK

Download from: https://expo.dev/artifacts/eas/oZZido2vKgALVeGtjNHdTU.apk

### 2. Install on Android Device

```bash
# Connect device via USB
adb install oZZido2vKgALVeGtjNHdTU.apk

# Or manually: Copy to device and tap to install
```

### 3. Grant Permissions

When app first opens:
- Tap "Allow" for notifications permission
- Tap "Allow" for other permissions

---

## Login via Telegram Bot

### Step-by-Step

1. **Open app** → Tap "Получить доступ через Telegram"
2. **Telegram opens** → Bot @rtrader_mobapp_bot appears
3. **Send `/start`** → Bot responds with options
4. **Wait for admin** → Admin will activate your subscription
5. **Send `/start` again** → Bot shows login link
6. **Tap "📱 Открыть RTrader"** → App opens and auto-logs in
7. **See chat list** ✅

### What to Expect

**New user flow:**
```
/start
↓
Bot: "Welcome! Choose option"
↓
Click: "💳 Оплатить подписку"
↓
Bot: "Contact @rhodes4ever for payment"
↓
[Admin activates subscription]
↓
/start again
↓
Bot: "Click to login"
↓
App: Auto-logs in ✅
```

---

## Testing Checklist

### Login & Navigation
- [ ] App opens without crashes
- [ ] "Получить доступ через Telegram" button works
- [ ] Telegram bot opens (@rtrader_mobapp_bot)
- [ ] `/start` command works
- [ ] Auto-login link opens app
- [ ] Chat list appears after login
- [ ] Tab bar shows: Home, Account

### Chats
- [ ] 12 chats visible in list
- [ ] Chat names are in Russian
- [ ] Can scroll through chat list
- [ ] Tap chat → opens chat screen

### Messaging
- [ ] Chat shows message list
- [ ] Can type message in input field
- [ ] Send button works
- [ ] Message appears in chat
- [ ] Message shows sender name
- [ ] Message shows timestamp

### Reply Functionality
- [ ] Long-press on message → shows reply option
- [ ] Tap reply → input shows "Replying to..."
- [ ] Send reply → appears as reply in chat
- [ ] Reply shows original message

### Mute/Unmute
- [ ] Swipe left on chat → shows mute button
- [ ] Tap mute → chat marked as muted
- [ ] Muted chat shows mute icon
- [ ] Unmute works (swipe → unmute button)

### Account Screen
- [ ] Tap "Account" tab
- [ ] Shows user name
- [ ] Shows subscription status
- [ ] Shows subscription expiry date
- [ ] "Logout" button works
- [ ] After logout → back to login screen

### Dark Mode
- [ ] App has dark theme (retro-wave neon)
- [ ] Colors are readable
- [ ] All screens work in dark mode

### Performance
- [ ] App doesn't crash
- [ ] No freezing when scrolling
- [ ] Messages load quickly
- [ ] No excessive battery drain

---

## Known Issues & Workarounds

### Issue: Bot doesn't respond to /start

**Workaround:**
1. Wait 30 seconds
2. Try `/start` again
3. If still doesn't work, contact admin

### Issue: Auto-login link doesn't open app

**Workaround:**
1. Copy the link from bot
2. Paste in browser address bar
3. Select "Open with RTrader"

### Issue: Messages not appearing

**Workaround:**
1. Pull down to refresh
2. Close and reopen app
3. Check internet connection

### Issue: App crashes on startup

**Workaround:**
1. Uninstall: `adb uninstall space.manus.rtrader.mobile`
2. Reinstall APK
3. Grant permissions again

---

## What NOT to Test (v1.0.0)

These features are planned for v1.1+:
- ❌ Media uploads (photos, videos)
- ❌ Search functionality
- ❌ User profiles
- ❌ Message reactions
- ❌ Voice messages

---

## Reporting Issues

### Format

```
Title: [CRASH/BUG/FEATURE] Brief description

Device: [Model, Android version]
App Version: 1.0.0
Steps to reproduce:
1. ...
2. ...
3. ...

Expected: ...
Actual: ...

Screenshot/Video: [if applicable]
```

### Examples

**Crash Report:**
```
Title: [CRASH] App crashes when opening chat

Device: Samsung Galaxy S21, Android 13
App Version: 1.0.0

Steps:
1. Login via Telegram
2. Tap on "Trading Signals" chat
3. App crashes

Expected: Chat opens
Actual: "Unfortunately, RTrader has stopped"

Error: NullPointerException in ChatScreen.tsx:45
```

**Bug Report:**
```
Title: [BUG] Message text is cut off

Device: Pixel 6, Android 12
App Version: 1.0.0

Steps:
1. Login
2. Open any chat
3. Send long message (>100 chars)

Expected: Message wraps to multiple lines
Actual: Message text is cut off at edge

Screenshot: [attached]
```

---

## Contact

- **Admin/Payment:** @rhodes4ever (Telegram)
- **Support:** support@rtrader.com
- **Bug Reports:** [Send to testing channel]

---

## Testing Timeline

- **Today:** Install APK, test login flow
- **Tomorrow:** Test all features
- **Day 3:** Report issues
- **Day 4:** Final testing before Play Store

---

## Success Criteria

✅ **Minimum (v1.0.0):**
- App installs without errors
- Login via Telegram bot works
- Can see 12 chats
- Can send/receive messages
- Can reply to messages
- Can mute/unmute chats
- Account screen shows subscription
- No crashes during normal use

✅ **Nice to have:**
- Push notifications work
- Dark mode looks good
- Performance is smooth
- No memory leaks

---

**Happy testing! 🚀**

If you find any issues, report them immediately.

---

**Prepared:** 2026-05-01  
**Status:** ✅ Ready for testing
