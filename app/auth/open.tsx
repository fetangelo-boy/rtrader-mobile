/**
 * Telegram Deep Link Redirect Page (Web Only)
 *
 * This page is opened in the browser when user taps the "Open App" button
 * in the Telegram bot after /approve.
 *
 * URL: https://rtradermob-gjsezgkc.manus.space/auth/open?email=...&password=...
 *
 * Flow:
 * 1. Telegram bot sends HTTPS URL (Telegram accepts https://, not rtrader://)
 * 2. User taps button → browser opens this page
 * 3. This page immediately redirects to rtrader://login?email=...&password=...
 * 4. If app is installed, it opens and auto-logs in
 * 5. If redirect fails, user sees a manual "Open App" button
 *
 * On native (if somehow opened): redirects to login screen with params.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Text, View, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function OpenAppScreen() {
  const params = useLocalSearchParams<{ email?: string; password?: string }>();
  const router = useRouter();
  const colors = useColors();
  const [status, setStatus] = useState<"redirecting" | "manual" | "error">("redirecting");
  const [countdown, setCountdown] = useState(3);

  const email = params.email ? decodeURIComponent(String(params.email)) : "";
  const password = params.password ? decodeURIComponent(String(params.password)) : "";

  useEffect(() => {
    if (!email || !password) {
      setStatus("error");
      return;
    }

    if (Platform.OS !== "web") {
      // On native: navigate directly to login with params
      router.replace({
        pathname: "/auth/login",
        params: { email, password },
      });
      return;
    }

    // On web: attempt deep link redirect
    const deepLink = `rtrader://login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    // Try to open the deep link
    try {
      window.location.href = deepLink;
    } catch (e) {
      console.error("[OpenApp] Deep link redirect failed:", e);
    }

    // After 3 seconds, show manual button (in case app didn't open)
    const timer = setTimeout(() => {
      setStatus("manual");
    }, 3000);

    // Countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [email, password]);

  const handleOpenApp = () => {
    if (!email || !password) return;
    const deepLink = `rtrader://login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    Linking.openURL(deepLink).catch(() => {
      // If Linking fails, try window.location
      if (Platform.OS === "web") {
        window.location.href = deepLink;
      }
    });
  };

  if (status === "error") {
    return (
      <ScreenContainer className="items-center justify-center p-8">
        <View className="items-center gap-4 max-w-sm">
          <Text style={{ fontSize: 48 }}>❌</Text>
          <Text className="text-xl font-bold text-foreground text-center">
            Ссылка недействительна
          </Text>
          <Text className="text-sm text-muted text-center">
            Запросите новую ссылку через Telegram-бот: @rtrader_mobapp_bot
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="items-center justify-center p-8">
      <View className="items-center gap-6 max-w-sm w-full">
        {/* Logo */}
        <View className="items-center gap-2">
          <Text
            style={{
              fontSize: 48,
              fontWeight: "bold",
              color: colors.primary,
            }}
          >
            RTrader
          </Text>
          <Text className="text-sm text-muted text-center">
            Трейдинговый супер-портал
          </Text>
        </View>

        {/* Status */}
        {status === "redirecting" ? (
          <View className="items-center gap-4">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-base font-semibold text-foreground text-center">
              Открываю приложение...
            </Text>
            <Text className="text-sm text-muted text-center">
              Если приложение не открылось автоматически,{"\n"}нажмите кнопку ниже
            </Text>
            <Text className="text-xs text-muted">
              {countdown > 0 ? `Ожидание ${countdown}с...` : ""}
            </Text>
          </View>
        ) : (
          <View className="items-center gap-4 w-full">
            <Text className="text-base font-semibold text-foreground text-center">
              🎉 Ваша подписка активирована!
            </Text>
            <Text className="text-sm text-muted text-center">
              Нажмите кнопку ниже для входа в приложение RTrader
            </Text>
          </View>
        )}

        {/* Open App Button */}
        <TouchableOpacity
          onPress={handleOpenApp}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 32,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            🚀 Открыть приложение RTrader
          </Text>
        </TouchableOpacity>

        {/* Instructions */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            width: "100%",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text className="text-xs text-muted text-center leading-5">
            Если кнопка не работает, убедитесь что приложение RTrader установлено на вашем устройстве.{"\n\n"}
            Войдите вручную используя email и пароль из сообщения бота.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
