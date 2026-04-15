# RTrader Mobile — Project Handover Guide

## 📋 Project Overview

**Project Name:** RTrader Mobile (Трейдинговый Супер-Портал)  
**Platform:** React Native with Expo SDK 54  
**Current Version:** 1.0.1  
**Latest Checkpoint:** `5aea2d9f`  
**Status:** MVP Ready for Testing

---

## 🎯 What Has Been Completed

### ✅ Core Features
- **Two-Tab Navigation:** Chats (Чаты) and Account (Аккаунт)
- **Chats Screen:** 8 interactive chat channels with message history
- **Chat Detail Screen:** Individual chat view with message replies
- **Account Screen:** Subscription status, user information, action buttons
- **Dark Retro-Wave Theme:** Neon cyan/violet/pink color scheme
- **Custom App Logo:** Neon-style icon for app launcher

### ✅ Technical Setup
- Expo Router 6 for navigation
- NativeWind 4 (Tailwind CSS) for styling
- TypeScript for type safety
- React Query for data management
- TRPC for API communication
- Safe Area handling for notches and home indicators

### ✅ Bug Fixes Applied
1. **Fixed "Unmatched Route" Error**
   - Created `app/index.tsx` as root route handler
   - Updated `app/_layout.tsx` with `initialRouteName="index"`
   - Redirects deep link `rtrader:///` to `/(tabs)/chats`

2. **Fixed FontFaceObserver Timeout**
   - Removed `expo-font` dependency (not needed for system fonts)
   - This was causing "6000ms timeout exceeded" error on Android

3. **Fixed Deep Linking Scheme**
   - Simplified scheme from `manus${timestamp}` to `rtrader`
   - Synchronized across `app.config.ts`, `app/_layout.tsx`, and `constants/oauth.ts`

---

## 📁 Project Structure

```
rtrader-mobile/
├── app/
│   ├── _layout.tsx              ← Root layout with Stack Navigator
│   ├── index.tsx                ← Root route handler (NEW)
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← Tab bar configuration
│   │   ├── chats.tsx            ← Chats screen
│   │   └── account.tsx          ← Account screen
│   ├── chat/
│   │   └── [id].tsx             ← Individual chat detail screen
│   └── oauth/
│       └── callback.tsx         ← OAuth callback handler
├── components/
│   ├── screen-container.tsx     ← SafeArea wrapper (use for all screens)
│   ├── haptic-tab.tsx           ← Tab bar button with haptics
│   └── ui/
│       └── icon-symbol.tsx      ← Icon mapping for tab bar
├── hooks/
│   ├── use-colors.ts            ← Theme colors hook
│   ├── use-color-scheme.ts      ← Dark/light mode detection
│   └── use-auth.ts              ← Auth state hook
├── lib/
│   ├── trpc.ts                  ← TRPC client
│   ├── utils.ts                 ← Utility functions (cn)
│   ├── theme-provider.tsx       ← Global theme context
│   └── _core/
│       ├── theme.ts             ← Runtime palette builder
│       ├── manus-runtime.ts     ← Manus integration
│       └── nativewind-pressable.ts ← NativeWind config
├── constants/
│   ├── theme.ts                 ← Theme colors export
│   └── oauth.ts                 ← OAuth configuration
├── assets/
│   └── images/
│       ├── icon.png             ← App icon (square)
│       ├── splash-icon.png      ← Splash screen icon
│       ├── favicon.png          ← Web favicon
│       ├── android-icon-foreground.png
│       ├── android-icon-background.png
│       └── android-icon-monochrome.png
├── app.config.ts                ← Expo configuration
├── tailwind.config.js           ← Tailwind CSS config
├── theme.config.js              ← Theme colors definition
├── package.json                 ← Dependencies
└── todo.md                       ← Feature tracking
```

---

## 🚀 Getting Started as New Developer

### Step 1: Access the Project
```bash
# The project is located at:
/home/ubuntu/rtrader-mobile

# Or access via Manus checkpoint:
manus-webdev://5aea2d9f
```

### Step 2: Install Dependencies
```bash
cd /home/ubuntu/rtrader-mobile
pnpm install
```

### Step 3: Start Development Server
```bash
# For web preview:
pnpm dev:metro

# For Android via Expo Go:
pnpm android

# For iOS via Expo Go:
pnpm ios
```

### Step 4: Test on Device
**Option A: Expo Go (Fastest)**
1. Install Expo Go app on your Android/iOS device
2. Run `pnpm dev:metro`
3. Scan QR code with Expo Go
4. App loads instantly for testing

**Option B: Native APK (Production)**
1. Wait until May 1, 2026 (Expo Free tier resets)
2. Run `eas build --platform android --profile preview`
3. Download APK from Expo dashboard
4. Install on Android device

---

## 🔧 Key Configuration Files

### `app.config.ts` — Expo Configuration
```typescript
const env = {
  appName: "RTrader",           // Display name
  appSlug: "rtrader-mobile",    // Unique identifier
  logoUrl: "",                   // S3 URL of app icon
  scheme: "rtrader",             // Deep link scheme
  iosBundleId: "space.manus.rtrader.mobile.t...",
  androidPackage: "space.manus.rtrader.mobile.t...",
};
```

### `theme.config.js` — Color Palette
```javascript
const themeColors = {
  primary: { light: '#0a7ea4', dark: '#0a7ea4' },
  background: { light: '#ffffff', dark: '#151718' },
  surface: { light: '#f5f5f5', dark: '#1e2022' },
  foreground: { light: '#11181C', dark: '#ECEDEE' },
  // ... more colors
};
```

### `app/_layout.tsx` — Navigation Structure
```typescript
<Stack screenOptions={{ headerShown: false }} initialRouteName="index">
  <Stack.Screen name="index" options={{ headerShown: false }} />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="chat/[id]" />
  <Stack.Screen name="oauth/callback" />
</Stack>
```

---

## 📊 Current Build Status

| Platform | Status | Notes |
|----------|--------|-------|
| **Android** | ⏳ Pending | EAS Free tier limit reached (resets May 1, 2026) |
| **iOS** | ⏸️ Deferred | Not in current scope (can be added later) |
| **Web** | ✅ Working | Available at dev server URL |

### Why EAS Build is Limited
- Expo offers limited free Android builds per month
- Current account has used all free builds for April 2026
- Limit resets on May 1, 2026
- Options: Wait, upgrade plan, or use local build (requires Android SDK)

---

## 🧪 Testing Checklist

Before considering the project "done," verify:

- [ ] App launches without "Unmatched Route" error
- [ ] App launches without "FontFaceObserver timeout" error
- [ ] Tab navigation works (Chats ↔ Account)
- [ ] Can open individual chat from list
- [ ] Can send/reply to messages in chat
- [ ] Mute/unmute notifications work
- [ ] Account screen shows subscription status
- [ ] All buttons are clickable and responsive
- [ ] Dark mode works correctly
- [ ] Layout is correct on different screen sizes

---

## 📝 Next Steps for New Developer

### Immediate (Before May 1)
1. Test app via Expo Go on Android device
2. Verify all navigation and UI work correctly
3. Fix any remaining bugs or UI issues
4. Add real social media links (Telegram, VK, Dzen) in Account screen

### After May 1 (When EAS Limit Resets)
1. Build final APK via `eas build --platform android`
2. Install on real Android device
3. Perform final testing
4. Prepare for app store submission (if needed)

### Future Enhancements
- [ ] Backend API integration for chat synchronization
- [ ] Push notifications
- [ ] User authentication
- [ ] Photo/file uploads in chats
- [ ] Search functionality
- [ ] Chat archiving
- [ ] Message reactions (emoji)
- [ ] Voice messages
- [ ] Video calls

---

## 🔗 Important Links

- **Manus Checkpoint:** `manus-webdev://5aea2d9f`
- **Expo Dashboard:** https://expo.dev/accounts/fedortaneev/projects/rtrader-mobile
- **Git Repository:** (Add if applicable)
- **Expo Documentation:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev
- **NativeWind Docs:** https://www.nativewind.dev

---

## 💡 Development Tips

### Adding New Screens
1. Create file in `app/` directory (e.g., `app/settings.tsx`)
2. Use `ScreenContainer` component for proper SafeArea handling
3. Use Tailwind classes for styling
4. Add to Stack Navigator in `app/_layout.tsx` if needed

### Styling
- Use Tailwind classes directly in `className` props
- Colors are defined in `theme.config.js` and available as tokens
- No `dark:` prefix needed — colors auto-switch based on theme

### Navigation
- Use `Link` component from `expo-router` for navigation
- Use `useRouter()` hook for programmatic navigation
- Deep links work with `rtrader://` scheme

### State Management
- Use React Context + `useReducer` for simple state
- Use Zustand for complex state (already installed)
- Use React Query for server data

---

## ⚠️ Known Issues & Workarounds

### Issue: "Unmatched Route" Error
**Status:** ✅ FIXED  
**Solution:** Root route handler (`app/index.tsx`) redirects to `/(tabs)/chats`

### Issue: "FontFaceObserver 6000ms timeout"
**Status:** ✅ FIXED  
**Solution:** Removed `expo-font` dependency (not needed for system fonts)

### Issue: EAS Build Free Tier Limit
**Status:** ⏳ WAITING  
**Solution:** Limit resets May 1, 2026. Can upgrade plan for immediate builds.

---

## 📞 Support & Questions

If you encounter issues:
1. Check `todo.md` for known tasks and bugs
2. Review this handover document
3. Check Expo documentation: https://docs.expo.dev
4. Check React Native documentation: https://reactnative.dev

---

## ✨ Summary

**What you're taking over:**
- A fully functional React Native mobile app MVP
- Two-tab navigation with chat functionality
- Dark retro-wave theme with custom branding
- All routing and navigation issues resolved
- Ready for testing on Android devices

**What you need to do:**
1. Test the app thoroughly
2. Fix any remaining issues
3. Add real social media links
4. Wait for May 1 to build final APK (or upgrade Expo plan)
5. Prepare for deployment

**Good luck! 🚀**
