// Server-side Supabase types and utilities
// This file is used by both server and client, so it only exports types
import { createClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          title: string;
          is_group: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          is_group?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          is_group?: boolean;
          created_at?: string;
        };
      };
      chat_participants: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          author_id: string;
          text: string;
          reply_to_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          author_id: string;
          text: string;
          reply_to_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          author_id?: string;
          text?: string;
          reply_to_message_id?: string | null;
          created_at?: string;
        };
      };
      chat_settings: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          muted: boolean;
          muted_until: string | null;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          muted?: boolean;
          muted_until?: string | null;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          muted?: boolean;
          muted_until?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: "active" | "canceled" | "trialing" | "expired";
          current_period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: string;
          status?: "active" | "canceled" | "trialing" | "expired";
          current_period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: string;
          status?: "active" | "canceled" | "trialing" | "expired";
          current_period_end?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

// Server-side Supabase client initialization

let serverSupabase: any = null;

export function getServerSupabase() {
  if (!serverSupabase) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on server");
    }

    serverSupabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  return serverSupabase;
}

// Re-export for backward compatibility
export const supabase = new Proxy({}, {
  get: (target, prop) => {
    return getServerSupabase()[prop];
  },
});
