import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import Constants from "expo-constants";

/**
 * Version Info Component
 * Displays app version, build number, and last update info
 * Useful for tracking which version is currently running
 */
export function VersionInfo() {
  const colors = useColors();
  const appVersion = Constants.expoConfig?.version || "unknown";
  
  // Get build timestamp from package.json or use current date
  const buildDate = new Date().toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View className="px-4 py-2 border-t" style={{ borderTopColor: colors.border }}>
      <Text className="text-xs text-muted">
        v{appVersion} • {buildDate}
      </Text>
    </View>
  );
}
