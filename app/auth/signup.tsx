import { View, Text, TouchableOpacity, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";

const TELEGRAM_BOT_URL = "https://t.me/rtrader_mobapp_bot";

export default function SignupScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="p-6">
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-bold text-foreground mb-4 text-center">
          Регистрация через Telegram
        </Text>
        <Text className="text-base text-muted text-center mb-8" style={{ lineHeight: 24 }}>
          Самостоятельная регистрация недоступна.{"\n"}
          Для получения доступа обратитесь к нашему Telegram-боту, оплатите подписку, и вам будут отправлены логин и пароль.
        </Text>

        <TouchableOpacity
          onPress={() => Linking.openURL(TELEGRAM_BOT_URL)}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#0088cc",
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 32,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18 }}>✈️</Text>
          <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 15 }}>
            Открыть Telegram-бота
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        >
          <Text className="text-sm text-primary">Назад к входу</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
