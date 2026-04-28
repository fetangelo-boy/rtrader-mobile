-- Update RLS policy: allow admins to post in info_only chats
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can send messages to interactive chats" ON messages;

-- Create new policy: participants/admins can post in interactive chats,
-- but only admins can post in info_only chats
CREATE POLICY "Users can send messages based on chat type and role" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Case 1: Interactive chats - participants and admins can post
      (
        EXISTS (
          SELECT 1 FROM chat_participants
          WHERE chat_participants.chat_id = messages.chat_id
          AND chat_participants.user_id = auth.uid()
          AND chat_participants.role IN ('participant', 'admin')
        ) AND
        EXISTS (
          SELECT 1 FROM chats
          WHERE chats.id = messages.chat_id
          AND chats.type = 'interactive'
        )
      )
      OR
      -- Case 2: Info-only chats - only admins can post
      (
        EXISTS (
          SELECT 1 FROM chat_participants
          WHERE chat_participants.chat_id = messages.chat_id
          AND chat_participants.user_id = auth.uid()
          AND chat_participants.role = 'admin'
        ) AND
        EXISTS (
          SELECT 1 FROM chats
          WHERE chats.id = messages.chat_id
          AND chats.type = 'info_only'
        )
      )
    )
  );
