import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl, SESSION_TOKEN_KEY } from "@/constants/oauth";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          try {
            console.log('[TRPC] Getting JWT token for headers...');
            
            // Get JWT token from secure storage (native) or localStorage (web)
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
            
            console.log('[TRPC] JWT token retrieved:', token ? 'yes' : 'no');
            
            if (token) {
              console.log('[TRPC] Token found, length:', token.length);
              return { Authorization: `Bearer ${token}` };
            } else {
              console.warn('[TRPC] No JWT token available');
              return {};
            }
          } catch (error) {
            console.error('[TRPC] Failed to get JWT token:', error);
            return {};
          }
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          console.log('[TRPC] Fetch request to:', url);
          return fetch(url, {
            ...options,
            credentials: "include",
          }).then(res => {
            if (!res.ok) {
              console.error('[TRPC] Response error:', res.status, res.statusText);
            }
            return res;
          });
        },
      }),
    ],
  });
}
