# Google Play Store Submission Checklist

**App:** RTrader Mobile  
**Version:** 1.0.4  
**Status:** Ready for submission  
**Date:** 2026-05-01  
**Latest Fix:** Fixed JSON parse error in login flow (v1.0.4)

---

## Pre-Submission Requirements

### ✅ Technical Requirements (Completed)

- [x] APK tested on real device
- [x] All critical features working
- [x] No crashes or major bugs
- [x] Minification enabled
- [x] Version code: 4
- [x] Version name: 1.0.4
- [x] Target SDK: 34+
- [x] Min SDK: 24

### ⏳ User Credentials Needed

**What you need to provide:**

1. **Google Play Developer Account**
   - Email: [Your Google account]
   - Password: [Your password]
   - 2FA method: [SMS/Authenticator app]
   - Status: ❌ Not yet provided

2. **App Signing Certificate**
   - Option A: Use EAS Managed Credentials (recommended)
     - Already configured ✅
     - EAS handles signing automatically
   - Option B: Use your own keystore
     - Keystore file: [Path to .keystore]
     - Keystore password: [Password]
     - Key alias: [Alias name]
     - Key password: [Password]
     - Status: ❌ Not applicable (using EAS)

---

## Step 1: Create App in Google Play Console

### What to do:
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in basic information:
   - **App name:** RTrader
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free
   - **Declaration:** Check all applicable boxes

### Status: ⏳ Waiting for user

---

## Step 2: Store Listing

### App Title
- **Title:** RTrader
- **Short description:** Трейдинговый супер-портал
- **Full description:** (See below)

### Full Description (300-4000 characters)

```
RTrader — это мобильное приложение для трейдеров и инвесторов.

Основные возможности:
• Реал-тайм чаты с сообществом трейдеров
• Обсуждение стратегий и рыночных событий
• Управление подписками
• Уведомления о важных сообщениях
• Темный режим для удобства

Присоединяйтесь к сообществу RTrader и улучшайте свои навыки трейдинга вместе с другими трейдерами!

Требования:
• Android 6.0 и выше
• Интернет-соединение
• Аккаунт Telegram для входа

Политика конфиденциальности: [URL]
Условия использования: [URL]
```

**Status:** ⏳ Waiting for user to review/edit

### Screenshots (Required)

**What to provide:**
- Minimum: 2 screenshots
- Maximum: 8 screenshots
- Format: PNG or JPEG
- Dimensions: 1080 x 1920 pixels (portrait)
- File size: Max 8 MB each

**Recommended screenshots:**
1. **Login screen** - Show Telegram bot login
2. **Chat list** - Show 12 chats
3. **Chat screen** - Show messaging interface
4. **Message reply** - Show reply functionality
5. **Account screen** - Show subscription status
6. **Mute notification** - Show mute feature
7. **Dark theme** - Show app in dark mode

**Status:** ⏳ Waiting for user to provide

### Feature Graphic (Required)

- **Dimensions:** 1024 x 500 pixels
- **Format:** PNG or JPEG
- **Purpose:** Displayed on store listing
- **Content:** App logo + tagline or key feature

**Status:** ⏳ Waiting for user to provide

### Icon (Required)

- **Dimensions:** 512 x 512 pixels
- **Format:** PNG (no transparency)
- **Status:** ✅ Already provided (assets/images/icon.png)

---

## Step 3: Content Rating

### Content Rating Questionnaire

**You'll need to answer:**

1. **Violence**
   - No violence in app ✅

2. **Sexual content**
   - No sexual content ✅

3. **Profanity**
   - No profanity filter needed ✅

4. **Alcohol, tobacco, drugs**
   - No references ✅

5. **Gambling**
   - Trading is not gambling ✅

6. **User-generated content**
   - Yes (user messages in chats)
   - Moderation: Telegram bot handles

7. **Personal data collection**
   - Email, Telegram ID
   - Purpose: Authentication

**Expected rating:** 3+ (Everyone)

**Status:** ⏳ Waiting for user to complete questionnaire

---

## Step 4: Privacy Policy

### Required URL

**What to provide:**
- Privacy policy URL: [Your domain]/privacy-policy
- Must be publicly accessible
- Must cover:
  - Data collection (email, Telegram ID)
  - Data usage (authentication, notifications)
  - Data retention (how long stored)
  - User rights (deletion, export)
  - Contact information

**Example structure:**
```
1. Introduction
2. Data We Collect
   - Email address
   - Telegram user ID
   - Push notification tokens
   - Chat messages (stored on Supabase)
3. How We Use Data
   - Authentication
   - Push notifications
   - Chat functionality
4. Data Security
   - Supabase RLS policies
   - Encrypted transmission
5. User Rights
   - Data deletion
   - Account deletion
6. Contact Us
   - Email: support@rtrader.com
   - Telegram: @rhodes4ever
```

**Status:** ⏳ Waiting for user to provide URL

---

## Step 5: App Permissions

### Requested Permissions

- [x] POST_NOTIFICATIONS (Push notifications)
- [x] INTERNET (Network access)
- [x] ACCESS_NETWORK_STATE (Check connectivity)

**Status:** ✅ Configured in app.config.ts

---

## Step 6: Pricing and Distribution

### Pricing
- **Type:** Free
- **Status:** ✅ Selected

### Countries
- **Distribution:** Worldwide
- **Excluded countries:** None
- **Status:** ✅ Ready

---

## Step 7: Release Management

### Build Upload

**What to do:**
1. Go to "Release" → "Production"
2. Click "Create new release"
3. Upload AAB file: `app-release.aab`
4. Review app bundle details
5. Click "Review release"

**Status:** ⏳ Waiting for AAB build completion

### Release Notes

```
Version 1.0.0 - Initial Release

Features:
• User authentication via Telegram bot
• 12 community chats for traders
• Real-time messaging with reply functionality
• Mute/unmute notifications per chat
• Account management with subscription status
• Dark theme (retro-wave neon style)
• Push notifications support

This is the first release of RTrader mobile app.
```

**Status:** ✅ Ready

---

## Step 8: Review and Submit

### Final Checklist

- [ ] App title and description finalized
- [ ] Screenshots uploaded (2-8 images)
- [ ] Feature graphic uploaded
- [ ] Content rating completed
- [ ] Privacy policy URL provided
- [ ] Pricing set to Free
- [ ] Distribution set to Worldwide
- [ ] AAB file uploaded
- [ ] Release notes added
- [ ] All required fields completed

### Submit for Review

1. Click "Review release"
2. Review all information
3. Click "Start rollout to Production"
4. Confirm submission

**Expected review time:** 1-3 hours (typically)

**Status:** ⏳ Waiting for user

---

## Post-Submission

### Monitoring

After submission:
1. Check review status in Play Console
2. Monitor for rejection reasons (if any)
3. Respond to feedback within 7 days
4. Monitor crash reports
5. Monitor user ratings and reviews

### What to expect

- **Approved:** App goes live on Play Store
- **Rejected:** Review feedback provided, resubmit after fixes
- **Suspended:** Serious policy violation, contact support

---

## AAB Build Command

When ready to build AAB:

```bash
# Build AAB for production
eas build --platform android --profile production

# Download from:
# https://expo.dev/accounts/fedortaneev/projects/rtrader-mobile
```

**Status:** ⏳ Ready to execute after APK testing

---

## Important Notes

1. **Google Play Developer Account Cost:** $25 one-time
2. **Review Time:** Usually 1-3 hours, can be up to 24 hours
3. **Rejections:** Most common reasons:
   - Incomplete store listing
   - Missing privacy policy
   - Inappropriate content
   - Policy violations
4. **Updates:** After first release, can update with new versions
5. **Rollout:** Can do staged rollout (10% → 50% → 100%)

---

## User Action Items

### Required (Before submission):
1. [ ] Provide Google Play Developer account credentials
2. [ ] Provide app screenshots (2-8 images, 1080x1920 px)
3. [ ] Provide feature graphic (1024x500 px)
4. [ ] Provide privacy policy URL
5. [ ] Review and approve store listing description
6. [ ] Complete content rating questionnaire

### Optional (After first release):
1. [ ] Monitor app reviews and ratings
2. [ ] Respond to user feedback
3. [ ] Plan v1.1 features (media uploads, search)
4. [ ] Monitor crash reports

---

## Timeline

| Step | Status | Timeline |
|------|--------|----------|
| APK testing | ⏳ In progress | Today |
| AAB build | ⏳ Ready to build | After APK test |
| Store listing | ⏳ Waiting for user | 1-2 days |
| Content rating | ⏳ Waiting for user | 30 min |
| Privacy policy | ⏳ Waiting for user | 1 day |
| Submit for review | ⏳ Ready | After all above |
| Review by Google | ⏳ Pending | 1-3 hours |
| Live on Play Store | ⏳ Pending | After approval |

---

## Support

- **Google Play Console Help:** https://support.google.com/googleplay/android-developer
- **EAS Build Docs:** https://docs.expo.dev/build/setup
- **RTrader Support:** @rhodes4ever on Telegram

---

**Checklist prepared:** 2026-05-01  
**Status:** ✅ Ready for submission (waiting for user input)
