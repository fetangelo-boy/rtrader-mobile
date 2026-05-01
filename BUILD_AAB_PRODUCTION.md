# RTrader Mobile — Build AAB for Google Play Store

**Status:** ✅ Ready to build  
**Version:** 1.0.0  
**Target:** Google Play Store  
**Build Type:** Android App Bundle (AAB)

---

## Prerequisites

✅ **Completed:**
- APK tested on real device
- All features verified working
- Version aligned (1.0.0)
- EAS projectId configured
- Supabase credentials verified
- Push notifications infrastructure ready

⏳ **Waiting for:**
- APK test results
- Google Play Developer account setup
- Store listing information

---

## Build Command

When ready to build AAB:

```bash
cd rtrader-mobile

# Build AAB for production (Google Play Store)
eas build --platform android --profile production

# This will:
# 1. Build Android App Bundle (AAB)
# 2. Sign with EAS managed certificate
# 3. Optimize for Google Play Store
# 4. Upload to EAS dashboard
```

**Expected build time:** 15-20 minutes

---

## EAS Configuration

The production profile is configured in `eas.json`:

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "distribution": "store",
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

**Configuration details:**
- `buildType: "app-bundle"` → Generates AAB (not APK)
- `distribution: "store"` → Optimized for Play Store
- `autoIncrement: true` → Version code auto-increments
- `gradleCommand` → Uses Gradle bundleRelease task

---

## Download AAB

After build completes:

1. Go to: https://expo.dev/accounts/fedortaneev/projects/rtrader-mobile
2. Find the production build
3. Click "Download"
4. Save `app-release.aab`

**File location:** `app-release.aab` (~40-50 MB)

---

## Validate AAB

### Using bundletool (Optional)

```bash
# Download bundletool
wget https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all-1.15.6.jar

# Validate AAB
java -jar bundletool-all-1.15.6.jar validate --bundle-path=app-release.aab

# Generate APKs from AAB (for testing)
java -jar bundletool-all-1.15.6.jar build-apks \
  --bundle=app-release.aab \
  --output=app.apks \
  --mode=universal
```

---

## Upload to Google Play Store

### Step 1: Create Release

1. Go to https://play.google.com/console
2. Select RTrader app
3. Go to "Release" → "Production"
4. Click "Create new release"

### Step 2: Upload AAB

1. Click "Browse files"
2. Select `app-release.aab`
3. Wait for upload and analysis
4. Review app bundle details

### Step 3: Add Release Notes

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

### Step 4: Review and Submit

1. Click "Review release"
2. Verify all information
3. Click "Start rollout to Production"
4. Confirm submission

---

## What Happens After Submission

### Review Process

1. **Automated checks** (5-10 minutes)
   - Malware scanning
   - Policy compliance
   - Permissions validation

2. **Manual review** (1-3 hours typically)
   - Functionality testing
   - Policy compliance
   - Content appropriateness

3. **Approval or Rejection**
   - ✅ Approved → App goes live
   - ❌ Rejected → Review feedback provided

### Monitoring

After approval:
1. Check Play Store listing
2. Monitor crash reports
3. Monitor user ratings
4. Respond to reviews

---

## Troubleshooting

### Build fails with "Unknown error"

**Solution:**
1. Check npm dependencies: `npm install --legacy-peer-deps`
2. Check Supabase credentials
3. Try building again: `eas build --platform android --profile production --wait`

### AAB upload fails

**Solution:**
1. Validate AAB: `bundletool validate --bundle-path=app-release.aab`
2. Check file size (should be <100 MB)
3. Try uploading again

### App rejected by Google

**Common reasons:**
1. Incomplete store listing
2. Missing privacy policy
3. Inappropriate content
4. Policy violations

**Solution:**
1. Read rejection feedback
2. Fix issues
3. Resubmit

---

## Version Management

### For future updates:

```bash
# Version 1.0.1 (patch)
# - Bug fixes
# - Minor improvements

# Version 1.1.0 (minor)
# - New features (media uploads, search)
# - Improvements

# Version 2.0.0 (major)
# - Significant changes
# - New architecture
```

**Version code auto-increments** with each build (1 → 2 → 3...)

---

## Next Steps

1. **Test APK** on real device
   - Verify all features
   - Check for crashes
   - Test push notifications

2. **Prepare store listing**
   - Screenshots (2-8 images)
   - Feature graphic (1024x500 px)
   - Description and keywords
   - Privacy policy URL

3. **Build AAB**
   - Run: `eas build --platform android --profile production`
   - Wait for completion

4. **Submit to Play Store**
   - Upload AAB
   - Add release notes
   - Submit for review

5. **Monitor approval**
   - Check review status
   - Respond to feedback if needed
   - Go live!

---

## Support

- **EAS Documentation:** https://docs.expo.dev/build
- **Google Play Console:** https://play.google.com/console
- **Play Store Policies:** https://play.google.com/about/developer-content-policy
- **RTrader Support:** @rhodes4ever

---

**Build guide prepared:** 2026-05-01  
**Status:** ✅ Ready to build after APK testing
