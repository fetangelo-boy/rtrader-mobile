# RTrader Mobile v1.0.0 — Quick APK Build Guide

**Status:** All fixes applied. Ready to build on your machine.

## What's Fixed

✅ **API Base URL** — Added to eas.json for production build  
✅ **Telegram Bot Link** — Fixed to open dialog (with `?start=app`)  
✅ **All code committed** to GitHub

## Build on Your Machine (5 minutes)

### Prerequisites
- Node.js 22+ installed
- `npm install -g eas-cli` (EAS CLI)
- Expo account (use: demetra68@gmail.com / B1adeRunner1968)

### Step 1: Clone and Install
```bash
git clone https://github.com/fetangelo-boy/rtrader-mobile.git
cd rtrader-mobile
npm install
```

### Step 2: Login to Expo
```bash
eas login
# Email: demetra68@gmail.com
# Password: B1adeRunner1968
```

### Step 3: Build APK (Preview)
```bash
eas build --platform android --profile preview
```

**Wait 10-15 minutes.** Build will complete on EAS servers.

### Step 4: Download APK
After build finishes, you'll see:
```
✅ Build finished
📦 APK: https://expo.dev/artifacts/eas/[ID].apk
```

Download and install:
```bash
adb install [ID].apk
```

## What Changed in This Build

| File | Change |
|------|--------|
| `eas.json` | Added `EXPO_PUBLIC_API_BASE_URL` to preview + production profiles |
| `app/auth/login.tsx` | Fixed Telegram bot URL to `https://t.me/rtrader_mobapp_bot?start=app` |

## Testing Checklist

After installation:

1. **Login with test account:**
   - Email: qa.tester.1777631070@rtrader.app
   - Password: rwWLA9kfLb

2. **OR Login via Telegram:**
   - Tap "Получить доступ через Telegram"
   - Should open bot dialog (not profile)
   - Send `/start`
   - Follow bot instructions

3. **Test features:**
   - ✅ See 12 chats
   - ✅ Send/receive messages
   - ✅ Reply to messages
   - ✅ Mute/unmute chats
   - ✅ View account + subscription

## Troubleshooting

**"Network error" when logging in?**
- Check that `EXPO_PUBLIC_API_BASE_URL` is set in build
- Should be: `https://3000-rtradermob-gjsezgkc.manus.space`

**Telegram bot opens profile instead of dialog?**
- Should be fixed in this build
- URL now includes `?start=app` parameter

**Build fails?**
- Run: `npm install`
- Clear cache: `eas build --platform android --profile preview --clear-cache`
- Check Node version: `node --version` (should be 22+)

## Next Steps

After successful APK test:
1. Build AAB for Google Play: `eas build --platform android --profile production`
2. Prepare store listing (screenshots, description)
3. Submit to Google Play Console
