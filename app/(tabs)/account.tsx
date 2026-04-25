import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { Image } from "expo-image";
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

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({
  colors,
  onEdit,
}: {
  colors: ReturnType<typeof useColors>;
  onEdit: () => void;
}) {
  const { data: profile, isLoading } = trpc.profile.getProfile.useQuery();

  const displayName = profile?.username || profile?.email?.split("@")[0] || "Пользователь";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        profileStyles.card,
        { borderBottomColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      {/* Avatar */}
      {isLoading ? (
        <View
          style={[
            profileStyles.avatarPlaceholder,
            { backgroundColor: colors.surface },
          ]}
        />
      ) : profile?.avatar_url ? (
        <Image
          source={{ uri: profile.avatar_url }}
          style={profileStyles.avatar}
          contentFit="cover"
        />
      ) : (
        <View
          style={[profileStyles.avatarPlaceholder, { backgroundColor: colors.primary }]}
        >
          <Text style={profileStyles.avatarInitials}>{initials}</Text>
        </View>
      )}

      {/* Info */}
      <View style={profileStyles.info}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Text
              style={[profileStyles.displayName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              style={[profileStyles.email, { color: colors.muted }]}
              numberOfLines={1}
            >
              {profile?.email || ""}
            </Text>
          </>
        )}
      </View>

      {/* Edit button */}
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          profileStyles.editBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[profileStyles.editBtnText, { color: colors.primary }]}>
          Изменить
        </Text>
      </Pressable>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  email: {
    fontSize: 13,
  },
  editBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
    Linking.openURL("https://t.me/rhodes4ever").catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть Telegram");
    });
  };

  const handleManageSubscription = () => {
    // ?start=renew opens the bot CHAT directly (not description page)
    // and triggers the renewal flow in the bot
    Linking.openURL("https://t.me/rtrader_mobapp_bot?start=renew").catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть бот подписки");
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

        {/* Профиль пользователя */}
        <ProfileCard colors={colors} onEdit={() => router.push("/profile")} />

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
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString("ru-RU")
                    : "—"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Социальные сети */}
        <View className="px-4 py-6 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-base font-semibold text-foreground mb-4">Следите за нами</Text>

          <View style={socialStyles.row}>
            <Pressable
              onPress={() => handleSocialLink("https://t.me/RTrader11")}
              style={({ pressed }) => [
                socialStyles.socialBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: colors.surface,
                  borderColor: "#0088cc",
                },
              ]}
            >
              <Text style={[socialStyles.socialBtnText, { color: colors.foreground }]}>Telegram</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSocialLink("https://vk.com/RTrader11")}
              style={({ pressed }) => [
                socialStyles.socialBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: colors.surface,
                  borderColor: "#0077ff",
                },
              ]}
            >
              <Text style={[socialStyles.socialBtnText, { color: colors.foreground }]}>VK</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSocialLink("https://Rtrader11.ru")}
              style={({ pressed }) => [
                socialStyles.socialBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: colors.surface,
                  borderColor: "#4CAF50",
                },
              ]}
            >
              <Text style={[socialStyles.socialBtnText, { color: colors.foreground }]}>Сайт</Text>
            </Pressable>
          </View>
        </View>

        {/* Действия */}
        <View style={actionStyles.container}>
          {/* Управление подпиской — primary action */}
          <Pressable
            onPress={handleManageSubscription}
            style={({ pressed }) => [
              actionStyles.primaryBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={actionStyles.primaryBtnText}>Управление подпиской</Text>
          </Pressable>

          {/* Служба поддержки — secondary action */}
          <Pressable
            onPress={handleSupport}
            style={({ pressed }) => [
              actionStyles.secondaryBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[actionStyles.secondaryBtnText, { color: colors.foreground }]}>
              Служба поддержки
            </Text>
          </Pressable>

          {/* Выход — destructive action */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              actionStyles.logoutBtn,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={actionStyles.logoutBtnText}>Выход</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Version Info */}
      <VersionInfo />
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const socialStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

const actionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },
});
