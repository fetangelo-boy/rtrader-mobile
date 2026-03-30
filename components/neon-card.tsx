import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface NeonCardProps {
  children: React.ReactNode;
  glowColor?: string;
  style?: ViewStyle;
  className?: string;
}

export function NeonCard({ children, glowColor, style, className }: NeonCardProps) {
  const colors = useColors();
  const glow = glowColor ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface + "CC",
          borderColor: glow + "66",
          shadowColor: glow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
