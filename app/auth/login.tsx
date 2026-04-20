import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import { useRouter } from "expo-router";
import { cn } from "@/lib/utils";
import * as SupabaseAuth from "@/lib/supabase-auth";

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
      await SupabaseAuth.signInWithEmail(email, password);
      // Navigation will happen automatically through auth state change
      router.replace("/(tabs)/chats");
    } catch (error: any) {
      Alert.alert("Ошибка входа", error.message || "Не удалось войти в аккаунт");
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
                className="px-4 py-3"
              >
                <Text className="text-lg">{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                backgroundColor: colors.primary,
              },
              { borderRadius: 8, paddingVertical: 14, marginBottom: 12 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-center font-semibold text-background text-base">
                Войти
              </Text>
            )}
          </Pressable>

          {/* Forgot Password Link */}
          <Pressable
            onPress={handleForgotPassword}
            disabled={loading}
            className="mb-6"
          >
            <Text className="text-center text-sm text-primary">
              Забыли пароль?
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            <Text className="px-3 text-xs text-muted">или</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center">
            <Text className="text-sm text-muted">Нет аккаунта? </Text>
            <Pressable onPress={handleSignUp} disabled={loading}>
              <Text className="text-sm font-semibold text-primary">
                Зарегистрироваться
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
