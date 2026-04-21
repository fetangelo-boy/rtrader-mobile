-- First, let's inspect what columns exist in chat_participants
-- Then recreate all tables with correct schema

-- Drop all policies
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can view participants of their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON chat_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages to interactive chats" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own settings" ON chat_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON chat_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON chat_settings;

-- Drop all indexes
DROP INDEX IF EXISTS idx_chat_participants_chat_id;
DROP INDEX IF EXISTS idx_chat_participants_user_id;
DROP INDEX IF EXISTS idx_chat_participants_role;
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_user_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_reply_to;
DROP INDEX IF EXISTS idx_chat_settings_chat_id;
DROP INDEX IF EXISTS idx_chat_settings_user_id;
DROP INDEX IF EXISTS idx_chat_settings_muted;
DROP INDEX IF EXISTS idx_chats_type;
DROP INDEX IF EXISTS idx_chats_created_at;

-- Recreate chat_participants - only copy columns that exist
CREATE TABLE chat_participants_new AS
SELECT id, chat_id::TEXT as chat_id, user_id, role, CURRENT_TIMESTAMP as joined_at
FROM chat_participants;

DROP TABLE chat_participants CASCADE;
ALTER TABLE chat_participants_new RENAME TO chat_participants;

ALTER TABLE chat_participants
  ADD PRIMARY KEY (id),
  ADD UNIQUE(chat_id, user_id),
  ADD CONSTRAINT fk_chat_participants_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Recreate messages with TEXT chat_id
CREATE TABLE messages_new AS
SELECT id, chat_id::TEXT as chat_id, user_id, content, reply_to_message_id, created_at, updated_at
FROM messages;

DROP TABLE messages CASCADE;
ALTER TABLE messages_new RENAME TO messages;

ALTER TABLE messages
  ADD PRIMARY KEY (id),
  ADD CONSTRAINT fk_messages_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Recreate chat_settings with TEXT chat_id
CREATE TABLE chat_settings_new AS
SELECT id, chat_id::TEXT as chat_id, user_id, is_muted, muted_until, created_at, updated_at
FROM chat_settings;

DROP TABLE chat_settings CASCADE;
ALTER TABLE chat_settings_new RENAME TO chat_settings;

ALTER TABLE chat_settings
  ADD PRIMARY KEY (id),
  ADD UNIQUE(chat_id, user_id),
  ADD CONSTRAINT fk_chat_settings_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Recreate chats with TEXT id
CREATE TABLE chats_new AS
SELECT id::TEXT as id, COALESCE(name, 'Untitled') as name, description, COALESCE(type, 'interactive') as type, created_at, updated_at
FROM chats;

DROP TABLE chats CASCADE;
ALTER TABLE chats_new RENAME TO chats;

ALTER TABLE chats
  ADD PRIMARY KEY (id),
  ADD CONSTRAINT check_type CHECK (type IN ('interactive', 'info_only'));

-- Add foreign key constraints for chat_id
ALTER TABLE chat_participants
  ADD CONSTRAINT fk_chat_participants_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL;

ALTER TABLE chat_settings
  ADD CONSTRAINT fk_chat_settings_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_role ON chat_participants(role);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);
CREATE INDEX idx_chat_settings_chat_id ON chat_settings(chat_id);
CREATE INDEX idx_chat_settings_user_id ON chat_settings(user_id);
CREATE INDEX idx_chat_settings_muted ON chat_settings(is_muted);

-- Enable RLS on all tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for chats
CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Recreate RLS policies for chat_participants
CREATE POLICY "Users can view participants of their chats" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own participation" ON chat_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage participants" ON chat_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
  );

-- Recreate RLS policies for messages
CREATE POLICY "Users can view messages from their chats" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to interactive chats" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
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
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Recreate RLS policies for chat_settings
CREATE POLICY "Users can view their own settings" ON chat_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON chat_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON chat_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
