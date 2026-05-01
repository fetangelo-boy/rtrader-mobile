# RTrader Mobile — Build APK Now (Quick Start)

**Status:** ✅ Ready to build  
**Version:** 1.0.0  
**Target:** Android 14+ (minSdkVersion: 24)

---

## Option 1: Build via EAS (Recommended — 5 minutes)

### Prerequisites
- Expo account (free): https://expo.dev
- EAS CLI: `npm install -g eas-cli`
- Node.js 18+

### Steps

```bash
# 1. Clone or navigate to project
cd rtrader-mobile

# 2. Install dependencies
npm install

# 3. Login to Expo
eas login

# 4. Build APK (will take ~10-15 minutes)
eas build --platform android --profile preview

# 5. Download APK
# Open https://expo.dev/accounts/[your-account]/projects/rtrader-mobile
# Find the build and download the APK
```

**Result:** APK file ready for installation on Android device

---

## Option 2: Build Locally (Requires Android SDK)

### Prerequisites
- Android SDK (API 34+)
- Android NDK
- Java 17+
- Gradle

### Steps

```bash
# 1. Navigate to project
cd rtrader-mobile

# 2. Install dependencies
npm install

# 3. Build release APK
npx expo run:android --variant release

# 4. Find APK
# Location: android/app/build/outputs/apk/release/app-release.apk
```

**Result:** APK file at `android/app/build/outputs/apk/release/app-release.apk`

---

## Option 3: Use Pre-Built APK (If Available)

If you received a pre-built APK file, skip to "Install on Device" section below.

---

## Install on Device

### Via ADB (Recommended)

```bash
# 1. Connect Android device via USB
# 2. Enable Developer Mode (tap Build Number 7 times in Settings)
# 3. Enable USB Debugging

# 4. Install APK
adb install app-release.apk

# 5. Launch app
adb shell am start -n space.manus.rtrader.mobile/space.manus.rtrader.mobile.MainActivity
```

### Via File Manager

1. Copy `app-release.apk` to Android device
2. Open file manager on device
3. Tap APK file to install
4. Grant permissions
5. Tap "Install"

---

## Test After Installation

### Login Flow
1. Tap "Получить доступ через Telegram" button
2. Open Telegram bot: @rtrader_mobapp_bot
3. Send `/start`
4. Follow bot instructions to create account
5. Get credentials from bot
6. Return to app and login with credentials

### Verify Features
- [ ] Login works
- [ ] Chat list displays (12 chats)
- [ ] Can send message in chat
- [ ] Reply functionality works
- [ ] Mute/unmute works
- [ ] Account screen shows subscription
- [ ] Logout works

---

## Troubleshooting

### "Installation failed"
```bash
# Uninstall previous version
adb uninstall space.manus.rtrader.mobile

# Try again
adb install app-release.apk
```

### "App crashes on launch"
1. Check logs: `adb logcat | grep RTrader`
2. Verify network connectivity
3. Check Supabase credentials in app.config.ts

### "Cannot connect to Telegram bot"
1. Verify bot is running: @rtrader_mobapp_bot
2. Check internet connectivity
3. Try `/start` command in bot

---

## Push Notifications Testing

After installing and logging in:

1. **Get push token** — App will automatically register token
2. **Verify in Supabase** — Check `push_tokens` table:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = '[your-user-id]';
   ```
3. **Send test notification** — Use Expo Push API:
   ```bash
   curl -X POST https://exp.host/--/api/v2/push/send \
     -H 'Content-Type: application/json' \
     -d '{
       "to": "ExponentPushToken[...]",
       "title": "Test",
       "body": "This is a test notification"
     }'
   ```
4. **Verify delivery** — Check if notification appears on device

---

## Next Steps

1. **Test APK on device** — Verify all features work
2. **Report issues** — Any crashes or bugs
3. **Build AAB** — For Google Play Store submission:
   ```bash
   eas build --platform android --profile production
   ```
4. **Submit to Play Store** — Follow Google Play Console instructions

---

## Support

- **Telegram Bot:** @rtrader_mobapp_bot
- **Support Contact:** @rhodes4ever
- **Expo Docs:** https://docs.expo.dev
- **Android Docs:** https://developer.android.com

---

**Build prepared:** 2026-05-01  
**Status:** ✅ Ready to build
