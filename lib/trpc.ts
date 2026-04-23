import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import { supabase } from "@/lib/supabase-client";

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
            console.log('[TRPC] Getting session for headers...');
            const { data: { session } } = await supabase.auth.getSession();
            console.log('[TRPC] Session retrieved:', session ? 'yes' : 'no');
            
            const token = session?.access_token;
            if (token) {
              console.log('[TRPC] Token found, length:', token.length);
              return { Authorization: `Bearer ${token}` };
            } else {
              console.warn('[TRPC] No session token available');
              const { data: { user } } = await supabase.auth.getUser();
              console.warn('[TRPC] User:', user ? user.email : 'null');
              return {};
            }
          } catch (error) {
            console.error('[TRPC] Failed to get Supabase session:', error);
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
