-- Add demo@rtrader.com user to all 8 chats
-- This script adds the demo@rtrader.com user to all chats in the chat_participants table

-- First, get the user_id for demo@rtrader.com
-- Then add them to all 8 chats

-- Add demo@rtrader.com to all 8 chats (5 interactive + 3 info-only)
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
