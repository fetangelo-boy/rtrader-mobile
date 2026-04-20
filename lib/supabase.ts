import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export types for database schema
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
