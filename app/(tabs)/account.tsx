import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface UserData {
  accountId: string;
  phone: string;
  email: string;
  tariff: string;
  status: "active" | "expiring" | "expired" | "blocked";
  startDate: string;
  endDate: string;
}

// Mock данные - в реальном приложении будут с backend
const USER_DATA: UserData = {
  accountId: "ACC-2024-001",
  phone: "+7 (999) 123-45-67",
  email: "user@example.com",
  tariff: "Premium",
  status: "active",
  startDate: "2024-01-15",
  endDate: "2025-01-15",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "expiring":
      return "bg-yellow-500";
    case "expired":
      return "bg-red-500";
    case "blocked":
      return "bg-red-600";
    default:
      return "bg-gray-500";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "Активна";
    case "expiring":
      return "Истекает";
    case "expired":
      return "Истекла";
    case "blocked":
      return "Заблокирована";
    default:
      return "Неизвестно";
  }
};

export default function AccountScreen() {
  const colors = useColors();

  const handleSupport = () => {
    // TODO: Открыть поддержку
    console.log("Support clicked");
  };

  const handleRestoreAccess = () => {
    // TODO: Восстановить доступ
    console.log("Restore access clicked");
  };

  const handleManageSubscription = () => {
    // TODO: Управление подпиской
    console.log("Manage subscription clicked");
  };

  const handleLogout = () => {
    // TODO: Выход
    console.log("Logout clicked");
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log("Could not open URL:", url);
    });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Заголовок */}
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold text-foreground">Аккаунт</Text>
        </View>

        {/* Статус подписки */}
        <View className="px-4 py-6 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center mb-4">
            <View className={cn("w-3 h-3 rounded-full mr-2", getStatusColor(USER_DATA.status))} />
            <Text className="text-lg font-semibold text-foreground">
              Подписка: {getStatusLabel(USER_DATA.status)}
            </Text>
          </View>

          <View className="bg-surface rounded-lg p-4 space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Тариф:</Text>
              <Text className="text-sm font-semibold text-foreground">{USER_DATA.tariff}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Начало:</Text>
              <Text className="text-sm font-semibold text-foreground">{USER_DATA.startDate}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Окончание:</Text>
              <Text className="text-sm font-semibold text-foreground">{USER_DATA.endDate}</Text>
            </View>
          </View>
        </View>

        {/* Информация об аккаунте */}
        <View className="px-4 py-6 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-base font-semibold text-foreground mb-4">Информация об аккаунте</Text>

          <View className="space-y-3">
            <View>
              <Text className="text-xs text-muted mb-1">ID аккаунта</Text>
              <Text className="text-sm font-mono text-foreground">{USER_DATA.accountId}</Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Email</Text>
              <Text className="text-sm text-foreground">{USER_DATA.email}</Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Телефон</Text>
              <Text className="text-sm text-foreground">{USER_DATA.phone}</Text>
            </View>
          </View>
        </View>

        {/* Социальные сети */}
        <View className="px-4 py-6 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-base font-semibold text-foreground mb-4">Следите за нами</Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => handleSocialLink("https://t.me/rtrader")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: colors.surface,
                  borderColor: "#0088cc",
                  borderWidth: 1,
                },
                { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, flex: 1 },
              ]}
            >
              <Text className="text-center font-semibold text-foreground">Telegram</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSocialLink("https://vk.com/rtrader")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: colors.surface,
                  borderColor: "#0077ff",
                  borderWidth: 1,
                },
                { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, flex: 1 },
              ]}
            >
              <Text className="text-center font-semibold text-foreground">VK</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSocialLink("https://dzen.ru/rtrader")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: colors.surface,
                  borderColor: "#ff0000",
                  borderWidth: 1,
                },
                { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, flex: 1 },
              ]}
            >
              <Text className="text-center font-semibold text-foreground">Дзен</Text>
            </Pressable>
          </View>
        </View>

        {/* Действия */}
        <View className="px-4 py-6 space-y-3 flex-1">
          <Pressable
            onPress={handleManageSubscription}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                backgroundColor: colors.primary,
              },
              { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
            ]}
          >
            <Text className="text-center font-semibold text-background">
              Управление подпиской
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreAccess}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                borderColor: colors.primary,
                borderWidth: 1,
              },
              { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
            ]}
          >
            <Text className="text-center font-semibold text-primary">
              Восстановить доступ
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSupport}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                borderColor: colors.border,
                borderWidth: 1,
              },
              { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
            ]}
          >
            <Text className="text-center font-semibold text-foreground">
              Поддержка
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                borderColor: colors.error,
                borderWidth: 1,
              },
              { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginTop: 8 },
            ]}
          >
            <Text className="text-center font-semibold text-error">
              Выход
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
