// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for RTrader app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "chart.bar.fill": "bar-chart",
  "person.3.fill": "group",
  "trophy.fill": "emoji-events",
  "ellipsis": "more-horiz",
  // Sections
  "star.fill": "star",
  "book.fill": "menu-book",
  "brain.head.profile": "psychology",
  "crown.fill": "workspace-premium",
  "message.fill": "chat",
  "magnifyingglass": "search",
  // Actions
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "arrow.right": "arrow-forward",
  "xmark": "close",
  "checkmark": "check",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  // Content
  "person.fill": "person",
  "questionmark.circle.fill": "help",
  "info.circle.fill": "info",
  "link": "link",
  "globe": "language",
  "bell.fill": "notifications",
  "heart.fill": "favorite",
  "eye.fill": "visibility",
  "lock.fill": "lock",
  "shield.fill": "security",
  "flame.fill": "local-fire-department",
  "bolt.fill": "bolt",
  "calendar": "calendar-today",
  "clock.fill": "schedule",
  "location.fill": "location-on",
  "photo.fill": "photo",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "speaker.wave.2.fill": "volume-up",
  "arrow.up.right": "open-in-new",
  "square.and.arrow.up": "share",
  "doc.fill": "description",
  "folder.fill": "folder",
  "tag.fill": "label",
  "chart.line.uptrend.xyaxis": "trending-up",
  "chart.line.downtrend.xyaxis": "trending-down",
  "dollarsign.circle.fill": "monetization-on",
  "percent": "percent",
  "waveform": "graphic-eq",
  "list.bullet": "list",
  "grid": "grid-view",
  "slider.horizontal.3": "tune",
  "arrow.clockwise": "refresh",
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.circle.fill": "error",
  "minus.circle.fill": "remove-circle",
  "plus.circle.fill": "add-circle",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
