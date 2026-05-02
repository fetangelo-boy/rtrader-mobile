import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";
import { signInWithEmail } from "@/lib/supabase-auth";

const TELEGRAM_BOT_URL = "https://t.me/rtrader_mobapp_bot?start=app";
const REFRESH_TOKEN_KEY = "app_refresh_token";

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

      // Use Supabase Auth directly — stable URL, no dependency on sandbox Express server
      const { user, session } = await signInWithEmail(emailVal.trim(), passwordVal);

      if (!session?.access_token) {
        throw new Error("Сервер не вернул токен доступа");
      }

      // Store access token under the key that use-auth.ts reads
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.access_token);
      if (session.refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token);
      }

      // Build user info compatible with use-auth.ts User type
      const displayName =
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        emailVal.split("@")[0];

      const userInfo = {
        id: 0,
        openId: user?.id ?? "",
        name: displayName,
        email: user?.email ?? emailVal,
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(userInfo));

      router.replace("/(tabs)/chats");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      let errorMessage = "Не удалось войти в аккаунт";

      if (error?.message?.includes("Invalid login credentials")) {
        errorMessage = "Неверный email или пароль.";
      } else if (error?.message?.includes("Email not confirmed")) {
        errorMessage = "Email не подтверждён. Обратитесь в поддержку.";
      } else if (
        error?.message?.includes("Network") ||
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("fetch")
      ) {
        errorMessage = "Ошибка сети. Проверьте интернет-соединение.";
      } else if (error?.message) {
        errorMessage = error.message;
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
            <View
              className="flex-row items-center"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
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

          {/* Hint */}
          <Text className="text-xs text-muted text-center mt-4">
            Для получения доступа оплатите подписку через{"\n"}нашего Telegram-бота. После
            проверки оплаты вам{"\n"}будут отправлены логин и пароль.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
