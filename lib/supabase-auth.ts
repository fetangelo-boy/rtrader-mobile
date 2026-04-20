import { supabase } from "./supabase";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SUPABASE_SESSION_KEY = "supabase_session";

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Store session token for native platforms
    if (Platform.OS !== "web" && data.session?.access_token) {
      await SecureStore.setItemAsync(SUPABASE_SESSION_KEY, JSON.stringify(data.session));
    }

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
 * Restore session from stored token (for native platforms)
 */
export async function restoreSession() {
  if (Platform.OS === "web") {
    // Web uses cookie-based auth, no restoration needed
    return null;
  }

  try {
    const sessionStr = await SecureStore.getItemAsync(SUPABASE_SESSION_KEY);
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);
    
    // Restore session in Supabase client
    const { data, error } = await supabase.auth.setSession(session);
    if (error) throw error;

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
  const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
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
