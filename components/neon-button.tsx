import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface NeonButtonProps {
  label: string;
  onPress?: () => void;
  color?: string;
  variant?: "filled" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export function NeonButton({
  label,
  onPress,
  color,
  variant = "filled",
  size = "md",
  style,
  textStyle,
  disabled,
}: NeonButtonProps) {
  const colors = useColors();
  const glowColor = color ?? colors.primary;

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    md: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    lg: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  };

  const textSizes: Record<string, TextStyle> = {
    sm: { fontSize: 13, fontWeight: "600" },
    md: { fontSize: 15, fontWeight: "700" },
    lg: { fontSize: 16, fontWeight: "700" },
  };

  const filledStyle: ViewStyle = {
    backgroundColor: glowColor + "22",
    borderWidth: 1.5,
    borderColor: glowColor,
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  };

  const outlineStyle: ViewStyle = {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: glowColor,
  };

  const ghostStyle: ViewStyle = {
    backgroundColor: "transparent",
    borderWidth: 0,
  };

  const variantStyle = variant === "filled" ? filledStyle : variant === "outline" ? outlineStyle : ghostStyle;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        sizeStyles[size],
        variantStyle,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      <Text
        style={[
          textSizes[size],
          { color: variant === "filled" ? glowColor : variant === "outline" ? glowColor : colors.muted },
          { textAlign: "center" },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
