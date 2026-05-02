import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const TELEGRAM_BOT_URL = "https://t.me/rtrader_mobapp_bot";

/**
 * Full-screen overlay shown when the user's subscription has expired.
 * Directs them to the Telegram bot to renew.
 */
export function SubscriptionExpired({ expiresAt }: { expiresAt?: string }) {
  const colors = useColors();

  const formattedDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const handleRenew = () => {
    Linking.openURL(TELEGRAM_BOT_URL);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.error + "18" }]}>
          <IconSymbol name="clock.fill" size={48} color={colors.error} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          Подписка истекла
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.muted }]}>
          {formattedDate
            ? `Ваша подписка закончилась ${formattedDate}. Для продолжения доступа к чатам продлите подписку через Telegram-бота.`
            : "Ваша подписка неактивна. Для получения доступа к чатам оформите подписку через Telegram-бота."}
        </Text>

        {/* Renew button */}
        <Pressable
          onPress={handleRenew}
          style={({ pressed }) => [
            styles.renewButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <IconSymbol name="paperplane.fill" size={20} color="#fff" />
          <Text style={styles.renewButtonText}>Продлить в Telegram</Text>
        </Pressable>

        {/* Help text */}
        <Text style={[styles.helpText, { color: colors.muted }]}>
          Напишите боту @rtrader_mobapp_bot для продления
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },
  renewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  renewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 13,
    textAlign: "center",
  },
});
