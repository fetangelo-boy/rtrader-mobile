-- Migration: add media fields to messages table
-- Supports Telegram channel post forwarding (photos, videos, documents)
-- and future media uploads in interactive chats

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('photo', 'video', 'document')),
  ADD COLUMN IF NOT EXISTS media_url  TEXT,    -- URL of photo stored in Supabase Storage
  ADD COLUMN IF NOT EXISTS file_id    TEXT,    -- Telegram file_id for video (resolved on-demand via media-proxy)
  ADD COLUMN IF NOT EXISTS tg_msg_id  BIGINT;  -- Telegram message ID for deduplication

-- Index for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_messages_tg_msg_id ON messages(tg_msg_id);
