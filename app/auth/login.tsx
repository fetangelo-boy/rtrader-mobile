import { View, Text, TextInput, TouchableOpacity, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import { useRouter } from "expo-router";
import { cn } from "@/lib/utils";
import * as SecureStore from "expo-secure-store";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }

    try {
      setLoading(true);
      console.log("[Login] Attempting backend login with:", email);
      
      // Get the API base URL
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
      console.log("[Login] Using API URL:", apiUrl);
      
      // Call backend login endpoint
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();
      console.log("[Login] Backend login successful, user:", data.user?.email);
      console.log("[Login] Access token received:", data.access_token ? "yes" : "no");
      
      // Store the access token for future API requests
      if (data.access_token) {
        console.log("[Login] Storing access token in SecureStore");
        await SecureStore.setItemAsync("supabase_access_token", data.access_token);
        if (data.refresh_token) {
          await SecureStore.setItemAsync("supabase_refresh_token", data.refresh_token);
        }
      }
      
      // CRITICAL: Set the session in Supabase client so supabase.auth.getSession() works on mobile
      if (data.access_token && data.refresh_token) {
        console.log("[Login] Setting Supabase session from backend tokens...");
        const supabase = getSupabaseClient();
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (setSessionError) {
          console.error("[Login] Failed to set Supabase session:", setSessionError);
          throw new Error("Failed to set session: " + setSessionError.message);
        }
        console.log("[Login] Supabase session set successfully");
      }
      
      // Navigate to chats
      console.log("[Login] Navigating to chats...");
      router.replace("/(tabs)/chats");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || "Не удалось войти в аккаунт";
      
      if (error.message?.includes("Network") || error.message?.includes("Failed to fetch")) {
        errorMessage = "Ошибка сети. Проверьте интернет соединение и попробуйте снова.";
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

  const handleSignUp = () => {
    router.push("signup" as any);
  };

  const handleForgotPassword = () => {
    router.push("forgot-password" as any);
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
              marginBottom: 12,
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

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={loading}
            style={{ marginBottom: 24 }}
          >
            <Text className="text-center text-sm text-primary">
              Забыли пароль?
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            <Text className="px-3 text-xs text-muted">или</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center">
            <Text className="text-sm text-muted">Нет аккаунта? </Text>
            <TouchableOpacity onPress={handleSignUp} disabled={loading}>
              <Text className="text-sm font-semibold text-primary">
                Зарегистрироваться
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
