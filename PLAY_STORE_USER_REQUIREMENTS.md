# What You Need to Provide for Google Play Store Submission

**App:** RTrader Mobile v1.0.0  
**Status:** Ready for submission (waiting for your input)

---

## 1. Google Play Developer Account

### What you need:
- [ ] Google Play Developer account (create at https://play.google.com/console)
- [ ] Cost: $25 one-time registration fee
- [ ] Account email and password
- [ ] 2FA method configured

### Why:
- Required to publish and manage apps on Google Play Store
- Used to upload AAB, manage store listing, monitor reviews

### Timeline:
- Account creation: ~15 minutes
- Payment processing: Instant
- Account activation: Usually immediate

---

## 2. App Screenshots

### What you need:
- [ ] 2-8 screenshots (minimum 2, maximum 8)
- [ ] Format: PNG or JPEG
- [ ] Dimensions: **1080 x 1920 pixels** (portrait orientation)
- [ ] File size: Max 8 MB each

### Recommended screenshots:
1. **Login screen** - Show Telegram bot login button
2. **Chat list** - Show 12 chats
3. **Chat screen** - Show messaging interface
4. **Message reply** - Show reply functionality
5. **Account screen** - Show subscription status
6. **Mute notification** - Show mute feature
7. **Dark theme** - Show app in dark mode

### How to capture:
```bash
# Using APK on Android device:
adb screenshot /path/to/screenshot.png

# Or use device's built-in screenshot (Power + Volume Down)
```

### Timeline:
- Taking screenshots: ~15 minutes
- Editing/optimizing: ~30 minutes

---

## 3. Feature Graphic

### What you need:
- [ ] 1 feature graphic image
- [ ] Dimensions: **1024 x 500 pixels**
- [ ] Format: PNG or JPEG
- [ ] File size: Max 8 MB

### Content:
- App logo + tagline
- Or key feature highlight
- Professional design

### Example:
```
[RTrader Logo] + "Trade Together"
or
[App Screenshot] + "Real-time Trading Chats"
```

### Timeline:
- Design/creation: ~30 minutes

---

## 4. Privacy Policy URL

### What you need:
- [ ] Public URL to privacy policy
- [ ] Example: `https://yourdomain.com/privacy-policy`
- [ ] Must be accessible from any browser

### What to include:
1. **Data Collection**
   - Email address
   - Telegram user ID
   - Push notification tokens
   - Chat messages

2. **Data Usage**
   - Authentication
   - Push notifications
   - Chat functionality
   - User support

3. **Data Retention**
   - How long data is stored
   - Deletion policy

4. **User Rights**
   - How to delete account
   - How to export data
   - Contact information

5. **Security**
   - Encryption methods
   - Data protection measures

### Template:
```markdown
# Privacy Policy

Last updated: 2026-05-01

## 1. Introduction
RTrader is a mobile application for traders...

## 2. Data We Collect
- Email address (for authentication)
- Telegram user ID (for login)
- Push notification tokens (for notifications)
- Chat messages (stored on Supabase)

## 3. How We Use Your Data
- Authentication and account management
- Sending push notifications
- Providing chat functionality
- Improving the app

## 4. Data Security
- Encrypted transmission (HTTPS)
- Supabase RLS policies
- Secure authentication (JWT)

## 5. Your Rights
- Delete your account: Contact support
- Export your data: Available in account settings
- Opt-out of notifications: Per-chat mute settings

## 6. Contact Us
Email: support@rtrader.com
Telegram: @rhodes4ever
```

### Timeline:
- Writing policy: ~1 hour
- Publishing: ~15 minutes

---

## 5. Store Listing Information

### App Title
- [ ] **Title:** RTrader (already set)

### Short Description
- [ ] **Description:** Трейдинговый супер-портал (already set)

### Full Description (300-4000 characters)
- [ ] Provide or approve this text:

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

### Keywords
- [ ] Provide 5-10 keywords:
  - Example: trading, crypto, stocks, chat, community, signals, forex, investing

### Timeline:
- Review/edit: ~15 minutes

---

## 6. Content Rating Questionnaire

### What you need:
- [ ] Complete Google's content rating questionnaire
- [ ] Questions about: violence, sexual content, profanity, gambling, etc.
- [ ] Expected rating: 3+ (Everyone)

### Process:
1. Go to Google Play Console
2. Select app
3. Go to "Content rating"
4. Click "Complete questionnaire"
5. Answer questions (takes ~5 minutes)
6. Submit

### Timeline:
- Completing questionnaire: ~5 minutes

---

## 7. Pricing and Distribution

### Pricing
- [ ] Confirm: **Free** (no charge to users)

### Distribution
- [ ] Confirm: **Worldwide** (all countries)
- [ ] No excluded countries

### Timeline:
- Confirming: ~2 minutes

---

## Optional: Release Notes

### For this release (v1.0.0):
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

### Timeline:
- Already prepared ✅

---

## Summary of Requirements

| Item | Status | Timeline | Priority |
|------|--------|----------|----------|
| Google Play account | ⏳ | 15 min | HIGH |
| Screenshots (2-8) | ⏳ | 45 min | HIGH |
| Feature graphic | ⏳ | 30 min | HIGH |
| Privacy policy URL | ⏳ | 1 hour | HIGH |
| Store description | ⏳ | 15 min | MEDIUM |
| Keywords | ⏳ | 10 min | MEDIUM |
| Content rating | ⏳ | 5 min | MEDIUM |
| Release notes | ✅ | 0 min | LOW |

**Total time to prepare:** ~3 hours

---

## Submission Timeline

1. **Today:** Test APK on device
2. **Tomorrow:** Provide all requirements above
3. **Day 3:** Build AAB
4. **Day 3:** Submit to Google Play Store
5. **Day 3-4:** Google reviews app (1-3 hours)
6. **Day 4:** App goes live! 🎉

---

## How to Provide Information

### Screenshots and Graphics:
- Upload to: [Shared folder or email]
- Format: PNG or JPEG
- Naming: `screenshot-1.png`, `feature-graphic.png`

### URLs and Text:
- Email to: [Your contact]
- Or provide in chat

### Account Credentials:
- Use secure method (encrypted email, password manager)
- Never share in plain text chat

---

## Questions?

- **Google Play Console Help:** https://support.google.com/googleplay/android-developer
- **RTrader Support:** @rhodes4ever on Telegram
- **Email:** support@rtrader.com

---

**Requirements prepared:** 2026-05-01  
**Status:** ✅ Ready for your input
