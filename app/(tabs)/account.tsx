import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { VersionInfo } from "@/components/version-info";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as SupabaseAuth from "@/lib/supabase-auth";

interface Subscription {
  id: string;
  plan: string;
  status: "active" | "canceled" | "trialing" | "expired";
  current_period_end: string;
  created_at: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "trialing":
      return "bg-blue-500";
    case "canceled":
      return "bg-yellow-500";
    case "expired":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "Активна";
    case "trialing":
      return "Пробный период";
    case "canceled":
      return "Отменена";
    case "expired":
      return "Истекла";
    default:
      return "Неизвестно";
  }
};

const getPlanLabel = (plan: string) => {
  switch (plan) {
    case "free":
      return "Бесплатный";
    case "basic":
      return "Базовый";
    case "premium":
      return "Premium";
    case "vip":
      return "VIP";
    default:
      return plan;
  }
};

export default function AccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch subscription status
  const { data: subData, isLoading: subLoading } = trpc.account.getSubscription.useQuery();

  useEffect(() => {
    if (subData) {
      setSubscription(subData);
      setLoading(false);
    }
  }, [subData]);

  const handleSupport = () => {
    Linking.openURL("https://t.me/rtrader_support").catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть Telegram");
    });
  };

  const handleRestoreAccess = () => {
    console.log("Restore access clicked");
  };

  const handleManageSubscription = () => {
    Linking.openURL("https://rtrader.ru/subscription").catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть страницу управления подпиской");
    });
  };

  const handleLogout = () => {
    Alert.alert(
      "Выход",
      "Вы уверены, что хотите выйти из аккаунта?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            try {
              await SupabaseAuth.signOut();
            } catch (e) {
              console.error("Logout error:", e);
            } finally {
              router.replace("/auth/login");
            }
          },
        },
      ]
    );
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log("Could not open URL:", url);
    });
  };

  if (loading || subLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Загрузка профиля...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Заголовок */}
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold text-foreground">Аккаунт</Text>
        </View>

        {/* Статус подписки */}
        {subscription && (
          <View className="px-4 py-6 border-b" style={{ borderBottomColor: colors.border }}>
            <View className="flex-row items-center mb-4">
              <View className={cn("w-3 h-3 rounded-full mr-2", getStatusColor(subscription.status))} />
              <Text className="text-lg font-semibold text-foreground">
                Подписка: {getStatusLabel(subscription.status)}
              </Text>
            </View>

            <View className="bg-surface rounded-lg p-4 space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Тариф:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {getPlanLabel(subscription.plan)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Начало:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {new Date(subscription.created_at).toLocaleDateString("ru-RU")}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Окончание:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {new Date(subscription.current_period_end).toLocaleDateString("ru-RU")}
                </Text>
              </View>
            </View>
          </View>
        )}

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
            onPress={handleSupport}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
              { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
            ]}
          >
            <Text className="text-center font-semibold text-foreground">
              Служба поддержки
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                backgroundColor: colors.surface,
                borderColor: colors.error,
                borderWidth: 1,
              },
              { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
            ]}
          >
            <Text className="text-center font-semibold text-error">
              Выход
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      
      {/* Version Info */}
      <VersionInfo />
    </ScreenContainer>
  );
}
