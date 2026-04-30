import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

const TELEGRAM_BOT_URL = "https://t.me/rtrader_mobapp_bot";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleBackToLogin = () => {
    router.back();
  };

  const handleOpenTelegram = () => {
    Linking.openURL(TELEGRAM_BOT_URL).catch(() => {});
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
              Самостоятельное восстановление пароля временно недоступно.
            </Text>
          </View>

          {/* Info card */}
          <View
            className="p-4 rounded-lg mb-6"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Text className="text-sm text-foreground leading-5">
              Чтобы восстановить доступ к аккаунту, напишите в наш Telegram-бот.
              Поддержка вышлет вам новые данные для входа после проверки.
            </Text>
          </View>

          {/* Telegram button */}
          <Pressable
            onPress={handleOpenTelegram}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.85 : 1,
                backgroundColor: "#0088cc",
                borderRadius: 8,
                paddingVertical: 14,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>✈️</Text>
            <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 15 }}>
              Написать в Telegram-поддержку
            </Text>
          </Pressable>

          {/* Back to login */}
          <Pressable onPress={handleBackToLogin} className="mt-4">
            <Text className="text-center text-sm text-muted">
              Вернуться к экрану входа
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
