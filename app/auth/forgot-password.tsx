import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as SupabaseAuth from "@/lib/supabase-auth";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите ваш email");
      return;
    }

    try {
      setLoading(true);
      await SupabaseAuth.resetPassword(email);
      setSent(true);
      Alert.alert(
        "Успешно",
        "Письмо для восстановления пароля отправлено на ваш email. Пожалуйста, проверьте входящие письма."
      );
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Не удалось отправить письмо");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 py-8 justify-center">
          {/* Header */}
          <View className="mb-8">
            <Pressable onPress={handleBackToLogin} className="mb-4 flex-row items-center">
              <Text className="text-2xl mr-2">←</Text>
              <Text className="text-base text-primary font-semibold">Назад</Text>
            </Pressable>
            <Text className="text-3xl font-bold text-foreground">Восстановление доступа</Text>
            <Text className="text-sm text-muted mt-2">
              Введите ваш email, и мы отправим ссылку для восстановления пароля
            </Text>
          </View>

          {/* Email Input */}
          <View className="mb-6">
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

          {/* Submit Button */}
          <Pressable
            onPress={handleResetPassword}
            disabled={loading}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                backgroundColor: colors.primary,
              },
              { borderRadius: 8, paddingVertical: 14 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-center font-semibold text-background text-base">
                Отправить ссылку
              </Text>
            )}
          </Pressable>

          {/* Info */}
          {sent && (
            <View className="mt-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm text-foreground text-center">
                ✓ Письмо отправлено! Проверьте вашу почту и следуйте инструкциям.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
