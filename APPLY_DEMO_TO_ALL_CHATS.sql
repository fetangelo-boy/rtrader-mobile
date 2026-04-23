-- SQL Script to add demo@rtrader.com to all 8 chats
-- Run this in Supabase SQL Editor to apply changes immediately

-- Add demo@rtrader.com user to all 8 chats (5 interactive + 3 info-only)
INSERT INTO chat_participants (chat_id, user_id, role, joined_at)
SELECT 
  c.id,
  p.id,
  CASE WHEN c.type = 'info_only' THEN 'subscriber' ELSE 'participant' END,
  NOW()
FROM chats c
CROSS JOIN profiles p
WHERE p.email = 'demo@rtrader.com'
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- Add chat settings for demo@rtrader.com for all 8 chats
INSERT INTO chat_settings (chat_id, user_id, is_muted, created_at, updated_at)
SELECT 
  c.id,
  p.id,
  false,
  NOW(),
  NOW()
FROM chats c
CROSS JOIN profiles p
WHERE p.email = 'demo@rtrader.com'
ON CONFLICT (chat_id, user_id) DO UPDATE SET updated_at = NOW();

-- Verify: Check how many chats demo@rtrader.com is now in
SELECT COUNT(*) as "Количество чатов для demo@rtrader.com"
FROM chat_participants cp
JOIN profiles p ON cp.user_id = p.id
WHERE p.email = 'demo@rtrader.com';
