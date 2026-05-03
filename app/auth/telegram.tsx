/**
 * Telegram Auto-Login Screen
 *
 * Handles the deep link: rtrader://auth/telegram?token=<one_time_token>
 *
 * Flow:
 * 1. App opens via deep link from Telegram bot after /approve
 * 2. This screen extracts the one-time token from URL params
 * 3. Calls /api/auth/exchange-telegram-token to get a Supabase session
 * 4. Saves session tokens and user info
 * 5. Redirects to /(tabs)/chats
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ScreenContainer } from "@/components/screen-container";
import { SESSION_TOKEN_KEY, USER_INFO_KEY, getApiBaseUrl } from "@/constants/oauth";

type Status = "loading" | "success" | "error";

export default function TelegramAuthScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = params.token;

    if (!token) {
      setStatus("error");
      setErrorMsg("Ссылка недействительна. Попробуйте снова через бот.");
      return;
    }

    exchangeToken(token);
  }, [params.token]);

  async function exchangeToken(token: string) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/exchange-telegram-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const msg = data.error || "Не удалось войти. Попробуйте снова.";
        console.error("[TelegramAuth] Exchange failed:", msg);
        setStatus("error");
        setErrorMsg(msg);
        return;
      }

      // Save session tokens
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        await SecureStore.setItemAsync("app_refresh_token", data.refresh_token);
      }

      // Save user info
      const userInfo = {
        id: data.user.id,
        openId: data.user.id,
        name: data.user.name,
        email: data.user.email,
        loginMethod: "telegram",
        lastSignedIn: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(userInfo));

      console.log("[TelegramAuth] Login successful for", data.user.email);
      setStatus("success");

      // Small delay so user sees the success state
      setTimeout(() => {
        router.replace("/(tabs)/chats");
      }, 800);
    } catch (err: any) {
      console.error("[TelegramAuth] Network error:", err);
      setStatus("error");
      setErrorMsg("Ошибка сети. Проверьте подключение и попробуйте снова.");
    }
  }

  return (
    <ScreenContainer className="items-center justify-center p-8">
      {status === "loading" && (
        <View className="items-center gap-4">
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text className="text-lg font-semibold text-foreground">Выполняется вход...</Text>
          <Text className="text-sm text-muted text-center">Подождите, идёт авторизация через Telegram</Text>
        </View>
      )}

      {status === "success" && (
        <View className="items-center gap-4">
          <Text className="text-5xl">✅</Text>
          <Text className="text-xl font-bold text-foreground">Добро пожаловать!</Text>
          <Text className="text-sm text-muted text-center">Вход выполнен успешно. Открываю чаты...</Text>
        </View>
      )}

      {status === "error" && (
        <View className="items-center gap-4">
          <Text className="text-5xl">❌</Text>
          <Text className="text-xl font-bold text-foreground">Ошибка входа</Text>
          <Text className="text-sm text-muted text-center">{errorMsg}</Text>
          <Text className="text-xs text-muted text-center mt-2">
            Откройте приложение вручную и войдите через email и пароль из сообщения бота.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}
