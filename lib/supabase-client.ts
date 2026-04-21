import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "./supabase";
import { supabaseConfig } from "./config";

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.key;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  console.error("supabaseUrl:", supabaseUrl);
  console.error("supabaseAnonKey:", supabaseAnonKey);
  console.error("Platform:", Platform.OS);
}

// Create storage adapter for session persistence on web
const createStorageAdapter = () => {
  if (Platform.OS === "web") {
    // Use localStorage on web for session persistence
    return {
      getItem: (key: string) => {
        try {
          return window.localStorage?.getItem(key) || null;
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage?.setItem(key, value);
        } catch {}
      },
      removeItem: (key: string) => {
        try {
          window.localStorage?.removeItem(key);
        } catch {}
      },
    };
  }
  // Return default storage for native (uses AsyncStorage)
  return undefined;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: createStorageAdapter(),
  },
});

export function getSupabaseClient() {
  return supabase;
}
