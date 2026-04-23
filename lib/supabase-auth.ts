import { supabase } from "./supabase-client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const SUPABASE_SESSION_KEY = "supabase_session";
const APP_VERSION_KEY = "app_version";
const CURRENT_APP_VERSION = Constants.expoConfig?.version || "1.0.0";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    console.log('[Auth] Starting sign in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Sign in error:', error);
      throw error;
    }
    console.log('[Auth] Sign in successful, user:', data.user?.id);

    // Store session token for native platforms
    if (Platform.OS !== "web" && data.session?.access_token) {
      console.log('[Auth] Storing session in SecureStore');
      await SecureStore.setItemAsync(SUPABASE_SESSION_KEY, JSON.stringify(data.session));
      console.log('[Auth] Session stored successfully');
    }

    console.log('[Auth] Returning user and session');
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear stored session token
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(SUPABASE_SESSION_KEY);
    }
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user as AuthUser | null;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    console.error("Get session error:", error);
    return null;
  }
}

/**
 * Send password recovery email
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.VITE_SUPABASE_URL}/auth/v1/callback`,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
}

/**
 * Update password with recovery token
 */
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Update password error:", error);
    throw error;
  }
}

/**
 * Clear old session if app version has changed
 */
export async function clearOldSessionIfVersionChanged() {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const storedVersion = await SecureStore.getItemAsync(APP_VERSION_KEY);
    console.log('[Auth] Stored app version:', storedVersion, 'Current version:', CURRENT_APP_VERSION);
    
    if (storedVersion !== CURRENT_APP_VERSION) {
      console.log('[Auth] App version changed, clearing old session data');
      await SecureStore.deleteItemAsync(SUPABASE_SESSION_KEY);
      await SecureStore.deleteItemAsync("supabase_access_token");
      await SecureStore.deleteItemAsync("supabase_refresh_token");
      // Store new version
      await SecureStore.setItemAsync(APP_VERSION_KEY, CURRENT_APP_VERSION);
    }
  } catch (error) {
    console.error('[Auth] Error checking app version:', error);
  }
}

/**
 * Restore session from stored token (for native platforms)
 */
export async function restoreSession() {
  if (Platform.OS === "web") {
    // Web uses cookie-based auth, no restoration needed
    return null;
  }

  try {
    console.log('[Auth] Attempting to restore session from SecureStore');
    const sessionStr = await SecureStore.getItemAsync(SUPABASE_SESSION_KEY);
    if (!sessionStr) {
      console.log('[Auth] No stored session found');
      return null;
    }

    console.log('[Auth] Found stored session, restoring...');
    const session = JSON.parse(sessionStr);
    
    // Restore session in Supabase client
    const { data, error } = await supabase.auth.setSession(session);
    if (error) {
      console.error('[Auth] Failed to restore session:', error);
      throw error;
    }

    console.log('[Auth] Session restored successfully');
    return data.session;
  } catch (error) {
    console.error("Restore session error:", error);
    // Clear invalid session
    await SecureStore.deleteItemAsync(SUPABASE_SESSION_KEY);
    return null;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data: subscription } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
    const user = session?.user as AuthUser | null;
    callback(user);

    // Store session on sign in
    if (event === "SIGNED_IN" && session?.access_token && Platform.OS !== "web") {
      await SecureStore.setItemAsync(SUPABASE_SESSION_KEY, JSON.stringify(session));
    }

    // Clear session on sign out
    if (event === "SIGNED_OUT" && Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(SUPABASE_SESSION_KEY);
    }
  });

  return subscription;
}
