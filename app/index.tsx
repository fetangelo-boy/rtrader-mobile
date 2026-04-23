import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useColors } from "@/hooks/use-colors";
import * as SupabaseAuth from "@/lib/supabase-auth";

/**
 * Root route handler
 * Checks authentication and redirects to appropriate screen
 */
export default function RootIndex() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const colors = useColors();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // On native platforms, restore session from SecureStore first
        if (Platform.OS !== "web") {
          console.log("[Auth Check] Native platform: checking app version and restoring session...");
          // Clear old session if app version changed
          await SupabaseAuth.clearOldSessionIfVersionChanged();
          // Then restore session if available
          await SupabaseAuth.restoreSession();
        }

        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("[Auth Check] Session check result:", session ? "authenticated" : "not authenticated");
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("[Auth Check] Error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Redirect to login if not authenticated, otherwise to chats
  return <Redirect href={isAuthenticated ? "/(tabs)/chats" : "/auth/login"} />;
}
