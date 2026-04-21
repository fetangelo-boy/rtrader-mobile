// NativeWind + Pressable: className can swallow onPress. Disable className mapping globally.
// NOTE: This patch breaks web touchables, so only apply on native platforms
import { Pressable } from "react-native";
import { remapProps } from "nativewind";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  remapProps(Pressable, { className: false });
}
