import { Redirect } from "expo-router";

/**
 * Root route handler
 * Redirects to (tabs) when app is launched with deep link rtrader:///
 */
export default function RootIndex() {
  return <Redirect href="/(tabs)/chats" />;
}
