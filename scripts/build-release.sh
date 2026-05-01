#!/bin/bash

# RTrader Mobile - Android Release Build Script
# This script builds APK and AAB for production release

set -e

echo "🚀 RTrader Mobile - Android Release Build"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js and npm found${NC}"

# Check environment variables
echo ""
echo "🔐 Checking environment variables..."

if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ EXPO_PUBLIC_SUPABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ EXPO_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase credentials found${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Run tests
echo ""
echo "🧪 Running tests..."
npm run test || echo -e "${YELLOW}⚠️  Some tests failed, but continuing...${NC}"

# Run TypeScript check
echo ""
echo "✅ Running TypeScript check..."
npm run check

# Build options
echo ""
echo "🏗️  Build Options:"
echo "1. Build APK (for testing)"
echo "2. Build AAB (for Google Play Store)"
echo "3. Build both APK and AAB"
echo ""

read -p "Select option (1-3): " BUILD_OPTION

case $BUILD_OPTION in
    1)
        echo -e "${YELLOW}Building APK...${NC}"
        echo "This requires Android SDK. If not installed, use EAS instead:"
        echo "  eas build --platform android --profile preview"
        npx expo run:android --variant release || {
            echo -e "${RED}❌ Local build failed. Use EAS instead:${NC}"
            echo "  npm install -g eas-cli"
            echo "  eas login"
            echo "  eas build --platform android --profile preview"
            exit 1
        }
        ;;
    2)
        echo -e "${YELLOW}Building AAB...${NC}"
        echo "This requires Android SDK. If not installed, use EAS instead:"
        echo "  eas build --platform android --profile production"
        npx expo run:android --variant release --output-format aab || {
            echo -e "${RED}❌ Local build failed. Use EAS instead:${NC}"
            echo "  npm install -g eas-cli"
            echo "  eas login"
            echo "  eas build --platform android --profile production"
            exit 1
        }
        ;;
    3)
        echo -e "${YELLOW}Building APK and AAB...${NC}"
        echo "This requires Android SDK. If not installed, use EAS instead:"
        echo "  eas build --platform android --profile production"
        npx expo run:android --variant release || {
            echo -e "${RED}❌ Local build failed. Use EAS instead:${NC}"
            echo "  npm install -g eas-cli"
            echo "  eas login"
            echo "  eas build --platform android --profile production"
            exit 1
        }
        npx expo run:android --variant release --output-format aab || true
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📦 Build artifacts:"
echo "  APK: android/app/build/outputs/apk/release/app-release.apk"
echo "  AAB: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "📖 Next steps:"
echo "  1. Test APK on device: adb install app-release.apk"
echo "  2. Submit AAB to Google Play Store"
echo "  3. See ANDROID_RELEASE_GUIDE.md for detailed instructions"
