import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import * as SecureStore from "expo-secure-store";
import { SESSION_TOKEN_KEY } from "@/constants/oauth";

/**
 * Root route handler
 * Checks JWT authentication and redirects to appropriate screen
 */
export default function RootIndex() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const colors = useColors();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("[Auth Check] Checking session token...");
        
        let token: string | null = null;
        
        if (Platform.OS !== 'web') {
          // Native: use SecureStore
          token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
        } else {
          // Web: use localStorage
          token = typeof window !== 'undefined' 
            ? localStorage.getItem(SESSION_TOKEN_KEY)
            : null;
        }
        
        console.log("[Auth Check] Session token check result:", token ? "authenticated" : "not authenticated");
        setIsAuthenticated(!!token);
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
