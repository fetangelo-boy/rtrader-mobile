# RTrader Mobile APK v1.0.4 - Build Instructions

## Overview

This document provides step-by-step instructions to build the RTrader Mobile APK v1.0.4 locally or using cloud CI/CD services.

## Prerequisites

### System Requirements
- **OS:** macOS 12+, Windows 10+, or Linux (Ubuntu 20.04+)
- **RAM:** 4 GB minimum (8 GB recommended)
- **Disk Space:** 10 GB free
- **Java:** JDK 11 or higher
- **Node.js:** 18+ LTS
- **npm or yarn:** Latest version

### Software Installation

```bash
# macOS (using Homebrew)
brew install openjdk@17 node

# Ubuntu/Debian
sudo apt-get install openjdk-17-jdk nodejs npm

# Windows
# Download from: https://www.oracle.com/java/technologies/downloads/
# Download from: https://nodejs.org/
```

## Option 1: Build Locally Using Expo + Gradle

### Step 1: Install Dependencies

```bash
cd rtrader-mobile
npm install
# or
yarn install
```

### Step 2: Generate Native Android Project

```bash
npx expo prebuild --platform android --clean
```

This generates the native Android project structure in the `android/` directory.

### Step 3: Configure Android Build

Edit `android/gradle.properties` to ensure Hermes is enabled:

```properties
hermesEnabled=true
```

### Step 4: Build APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 5: Build App Bundle (AAB) for Play Store

```bash
cd android
./gradlew bundleRelease
```

The AAB will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Option 2: Build Using EAS (Recommended)

### Prerequisites
- Expo account (https://expo.dev)
- EAS CLI installed: `npm install -g eas-cli`
- Valid EXPO_TOKEN with proper scopes

### Step 1: Authenticate with EAS

```bash
eas login
```

Or set EXPO_TOKEN:
```bash
export EXPO_TOKEN=your_valid_token_here
```

### Step 2: Build APK

```bash
eas build --platform android --profile production
```

### Step 3: Build App Bundle (AAB)

```bash
eas build --platform android --profile production --type app-bundle
```

The build will be hosted on EAS and available for download from the dashboard.

## Option 3: Use GitHub Actions (CI/CD)

### Prerequisites
- GitHub repository with valid EXPO_TOKEN secret
- Workflow file: `.github/workflows/eas-build.yml`

### Step 1: Ensure EXPO_TOKEN is Valid

1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Verify `EXPO_TOKEN` is set with a valid token
3. Token must have scopes: `build`, `submit`, `api`

### Step 2: Trigger Build

```bash
git push origin main
```

Or manually trigger:
1. Go to Actions → EAS Build APK
2. Click "Run workflow"
3. Select platform: `android`
4. Select profile: `production`
5. Click "Run workflow"

### Step 3: Download APK

Once build completes:
1. Go to the workflow run
2. Download artifacts
3. Extract and locate the APK file

## Signing the APK for Play Store

### Option A: Using EAS Submit (Recommended)

```bash
eas submit --platform android --path app-release.aab
```

### Option B: Manual Signing

1. Create keystore (if not exists):
```bash
keytool -genkey -v -keystore rtrader-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias rtrader-release
```

2. Sign APK:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore rtrader-release.keystore \
  app-release.apk rtrader-release
```

3. Verify signature:
```bash
jarsigner -verify -verbose -certs app-release.apk
```

## Testing the APK

### Install on Device

```bash
adb install app-release.apk
```

### Test Checklist

- [ ] App launches without crashes
- [ ] Login flow works (email/password)
- [ ] Chat list displays
- [ ] Messages load correctly
- [ ] Can send messages
- [ ] Push notifications work (if enabled)
- [ ] Dark mode toggle works
- [ ] All tabs are accessible

## Troubleshooting

### Build Fails: "Out of Memory"
- Increase Gradle memory: `export GRADLE_OPTS="-Xmx4096m"`
- Close other applications
- Use EAS Build instead (cloud-based)

### Build Fails: "Android SDK not found"
- Set `ANDROID_HOME`: `export ANDROID_HOME=$HOME/Android/Sdk`
- Install SDK: `sdkmanager --install "platforms;android-34"`

### Build Fails: "Hermes compilation error"
- Ensure `hermesEnabled=true` in `gradle.properties`
- Clear build cache: `./gradlew clean`
- Rebuild: `./gradlew assembleRelease`

### APK Installation Fails
- Uninstall previous version: `adb uninstall space.manus.rtrader.mobile`
- Clear app data: `adb shell pm clear space.manus.rtrader.mobile`
- Reinstall: `adb install app-release.apk`

## Version Information

- **App Version:** 1.0.4
- **Build Date:** May 1, 2026
- **Target Android:** API 34+
- **Min Android:** API 24+
- **React Native:** 0.81.5
- **Expo SDK:** 54

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review EAS documentation: https://docs.expo.dev/eas-update/
3. Check React Native docs: https://reactnative.dev/
4. Review app logs: `adb logcat | grep RTrader`

## Next Steps

1. Build APK using one of the options above
2. Test on Android device or emulator
3. Sign APK for Play Store
4. Submit to Google Play Store
5. Monitor for crashes and user feedback

---

**Last Updated:** May 1, 2026
**Status:** Ready for v1.0.4 release
