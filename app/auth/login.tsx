import { View, Text, TextInput, TouchableOpacity, Pressable, ActivityIndicator, Alert, ScrollView, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getSupabaseClient } from "@/lib/supabase-client";

const TELEGRAM_BOT_URL = "https://t.me/rtrader_vip_bot";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle deep link: rtrader://login?email=...&password=...
  useEffect(() => {
    if (params.email && params.password) {
      const decodedEmail = decodeURIComponent(String(params.email));
      const decodedPassword = decodeURIComponent(String(params.password));
      setEmail(decodedEmail);
      setPassword(decodedPassword);
      // Auto-login after a short delay to ensure state is set
      setTimeout(() => {
        handleLoginWithCredentials(decodedEmail, decodedPassword);
      }, 300);
    }
  }, [params.email, params.password]);

  const handleLoginWithCredentials = async (emailVal: string, passwordVal: string) => {
    if (!emailVal.trim() || !passwordVal.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();

      if (data.access_token) {
        await SecureStore.setItemAsync("supabase_access_token", data.access_token);
        if (data.refresh_token) {
          await SecureStore.setItemAsync("supabase_refresh_token", data.refresh_token);
        }
      }

      if (data.access_token && data.refresh_token) {
        const supabase = getSupabaseClient();
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (setSessionError) {
          throw new Error("Failed to set session: " + setSessionError.message);
        }
      }

      router.replace("/(tabs)/chats");
    } catch (error: any) {
      let errorMessage = error.message || "Не удалось войти в аккаунт";
      if (error.message?.includes("Network") || error.message?.includes("Failed to fetch")) {
        errorMessage = "Ошибка сети. Проверьте интернет-соединение.";
      } else if (error.message?.includes("Invalid email or password")) {
        errorMessage = "Неверный email или пароль.";
      } else if (error.message?.includes("User not found")) {
        errorMessage = "Пользователь не найден.";
      }
      Alert.alert("Ошибка входа", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    handleLoginWithCredentials(email, password);
  };

  const handleGetAccess = () => {
    Linking.openURL(TELEGRAM_BOT_URL);
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 py-8 justify-center">
          {/* Logo / Title */}
          <View className="mb-8 items-center">
            <Text className="text-4xl font-bold text-primary mb-2">RTrader</Text>
            <Text className="text-base text-muted text-center">
              Трейдинговый супер-портал
            </Text>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              className="px-4 py-3 rounded-lg text-foreground"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              }}
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Пароль</Text>
            <View className="flex-row items-center" style={{ backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                className="flex-1 px-4 py-3 text-foreground"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={{ paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <Text className="text-lg">{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 14,
              marginBottom: 24,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-center font-semibold text-background text-base">
                Войти
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            <Text className="px-3 text-xs text-muted">нет аккаунта?</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          </View>

          {/* Get Access via Telegram Bot */}
          <TouchableOpacity
            onPress={handleGetAccess}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#0088cc",
              borderRadius: 8,
              paddingVertical: 14,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>✈️</Text>
            <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 15 }}>
              Получить доступ через Telegram
            </Text>
          </TouchableOpacity>

          {/* Help text */}
          <Text className="text-xs text-muted text-center mt-4 px-4" style={{ lineHeight: 18 }}>
            Для получения доступа оплатите подписку через нашего Telegram-бота. После проверки оплаты вам будут отправлены логин и пароль.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
