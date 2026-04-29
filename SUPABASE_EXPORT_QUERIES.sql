-- Supabase Export Queries (Run in Supabase SQL Editor)
-- Purpose: Backup all chat data before migration to MySQL

-- 1. Export chats
COPY (
  SELECT id, name, description, type as chatType, icon, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
  FROM chats
  ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- 2. Export messages
COPY (
  SELECT id, chat_id as chatId, user_id as userId, content, NULL as mediaUrl, NULL as mediaType, reply_to_id as replyToId, created_at as createdAt, updated_at as updatedAt
  FROM messages
  ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- 3. Export chat_participants
COPY (
  SELECT id, chat_id as chatId, user_id as userId, role, is_muted as isMuted, joined_at as joinedAt
  FROM chat_participants
  ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Alternative: JSON export (for easier inspection)
-- SELECT json_agg(row_to_json(t)) FROM chats t;
-- SELECT json_agg(row_to_json(t)) FROM messages t;
-- SELECT json_agg(row_to_json(t)) FROM chat_participants t;
