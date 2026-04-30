/**
 * REST API client against Beget backend.
 *
 * Replaces tRPC for all non-auth screens. The deployed backend at
 * EXPO_PUBLIC_API_BASE_URL is REST-only (no /api/trpc), so every
 * tRPC call in the client is being migrated here piecewise.
 *
 * Auth is JWT bearer (access token from SecureStore on native,
 * localStorage on web), matching app/auth/login.tsx and lib/trpc.ts.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

const JWT_ACCESS_TOKEN_KEY = "jwt_access_token";
const JWT_REFRESH_TOKEN_KEY = "jwt_refresh_token";

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS !== "web") {
      return await SecureStore.getItemAsync(JWT_ACCESS_TOKEN_KEY);
    }
    return typeof window !== "undefined"
      ? window.localStorage.getItem(JWT_ACCESS_TOKEN_KEY)
      : null;
  } catch {
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS !== "web") {
      return await SecureStore.getItemAsync(JWT_REFRESH_TOKEN_KEY);
    }
    return typeof window !== "undefined"
      ? window.localStorage.getItem(JWT_REFRESH_TOKEN_KEY)
      : null;
  } catch {
    return null;
  }
}

async function setTokens(access: string, refresh?: string) {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(JWT_ACCESS_TOKEN_KEY, access);
    if (refresh) await SecureStore.setItemAsync(JWT_REFRESH_TOKEN_KEY, refresh);
  } else if (typeof window !== "undefined") {
    window.localStorage.setItem(JWT_ACCESS_TOKEN_KEY, access);
    if (refresh) window.localStorage.setItem(JWT_REFRESH_TOKEN_KEY, refresh);
  }
}

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  retried = false
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError("API base URL not configured", 0, "no_base_url");
  }

  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to refresh on 401 once
  if (res.status === 401 && !retried) {
    const refresh = await getRefreshToken();
    if (refresh) {
      try {
        const refreshRes = await fetch(`${base}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (refreshRes.ok) {
          const r = await refreshRes.json();
          if (r?.accessToken) {
            await setTokens(r.accessToken, r.refreshToken);
            return request<T>(method, path, body, true);
          }
        }
      } catch {
        // fall through to error below
      }
    }
  }

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    // ignore — empty body
  }

  if (!res.ok) {
    const code = json?.error || json?.code;
    throw new ApiError(
      typeof code === "string" ? code : `HTTP ${res.status}`,
      res.status,
      typeof code === "string" ? code : undefined
    );
  }

  return json as T;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatSummary {
  id: string;
  name?: string;
  title?: string;
  description?: string | null;
  chatType?: string;
  type?: string;
  icon?: string | null;
  sortOrder?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  lastMessage?: any;
  userRole?: string;
  isMuted?: boolean;
}

export interface ChatMessage {
  id: string;
  chatId?: string;
  chat_id?: string;
  userId?: string;
  user_id?: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyToId?: string | null;
  reply_to_message_id?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  author?: { id: string; name?: string | null; email?: string };
  profiles?: { username?: string | null };
  reply_to_msg?: any;
}

export const chatApi = {
  list: async (): Promise<ChatSummary[]> => {
    const r = await request<{ chats: ChatSummary[] } | ChatSummary[]>("GET", "/api/chats");
    return Array.isArray(r) ? r : r?.chats || [];
  },

  // Backend has no GET /api/chats/:id — derive from list
  getInfo: async (chatId: string): Promise<ChatSummary | null> => {
    const list = await chatApi.list();
    return list.find((c) => String(c.id) === String(chatId)) || null;
  },

  getMessages: async (chatId: string, limit = 50, offset = 0): Promise<ChatMessage[]> => {
    const qs = `?limit=${limit}&offset=${offset}`;
    const r = await request<{ messages: ChatMessage[] } | ChatMessage[]>(
      "GET",
      `/api/chats/${encodeURIComponent(chatId)}/messages${qs}`
    );
    return Array.isArray(r) ? r : r?.messages || [];
  },

  sendMessage: async (chatId: string, input: { content: string; replyToId?: string; mediaUrl?: string; mediaType?: string }): Promise<ChatMessage> => {
    const r = await request<ChatMessage | { message: ChatMessage }>(
      "POST",
      `/api/chats/${encodeURIComponent(chatId)}/messages`,
      input
    );
    return (r as any)?.message || (r as ChatMessage);
  },
};

// ─── Notifications ──────────────────────────────────────────────────────────

export const notificationsApi = {
  registerToken: async (token: string, platform: "ios" | "android" | "web"): Promise<{ success: boolean }> => {
    return request("POST", "/api/notifications/register-token", { token, platform });
  },
};

// ─── Profile (graceful fallback — endpoints may not exist) ──────────────────

export interface UserProfile {
  id: string;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
  isAdmin?: boolean;
}

export const profileApi = {
  /** Read profile via /api/auth/me; backend has no separate /api/profile */
  get: async (): Promise<UserProfile | null> => {
    try {
      const r = await request<{ user: any }>("GET", "/api/auth/me");
      if (!r?.user) return null;
      return {
        id: r.user.id,
        email: r.user.email,
        username: r.user.displayName || r.user.username || null,
        avatar_url: r.user.avatar_url || null,
        isAdmin: r.user.isAdmin,
      };
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  },

  /** Backend does not expose profile mutations — surface a clear error */
  update: async (_input: { username?: string }): Promise<never> => {
    throw new ApiError("profile_update_not_supported", 501, "not_supported");
  },

  uploadAvatar: async (_input: { base64: string; mimeType: string }): Promise<never> => {
    throw new ApiError("avatar_upload_not_supported", 501, "not_supported");
  },
};

// ─── Subscription / account (no backend endpoint yet — return null) ─────────

export interface SubscriptionInfo {
  id?: string;
  plan: string;
  status: "active" | "canceled" | "trialing" | "expired";
  current_period_end?: string | null;
  expires_at?: string | null;
  created_at?: string;
}

export const accountApi = {
  /**
   * Backend doesn't expose /api/account/subscription. Return a synthetic
   * "active free" record so the subscription guard doesn't block the app.
   * When the real endpoint ships, this is the only call to update.
   */
  getSubscription: async (): Promise<SubscriptionInfo> => {
    try {
      const r = await request<SubscriptionInfo>("GET", "/api/account/subscription");
      return r;
    } catch (e: any) {
      if (e?.status === 404 || e?.code === "not_found") {
        return {
          plan: "free",
          status: "active",
          current_period_end: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        };
      }
      throw e;
    }
  },
};

export { ApiError };
