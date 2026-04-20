import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import type { Database } from "./supabase";

// Get Supabase URL and key from environment
// Try multiple sources: Constants.expoConfig.extra, process.env, import.meta.env
const supabaseUrl = (
  Constants.expoConfig?.extra?.supabaseUrl ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  ""
) as string;

const supabaseAnonKey = (
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  ""
) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  console.error("supabaseUrl:", supabaseUrl);
  console.error("supabaseAnonKey:", supabaseAnonKey);
  console.error("Constants.expoConfig?.extra:", Constants.expoConfig?.extra);
  console.error("process.env.VITE_SUPABASE_URL:", typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL : "N/A");
  console.error("process.env.EXPO_PUBLIC_SUPABASE_URL:", typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_URL : "N/A");
  throw new Error("Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in environment.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient() {
  return supabase;
}
