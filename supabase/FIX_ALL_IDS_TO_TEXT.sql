-- Comprehensive fix: Convert all chat_id columns from UUID to TEXT
-- Must handle all dependent tables in correct order

-- Step 1: Drop all RLS policies
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

-- Step 2: Drop all indexes
DROP INDEX IF EXISTS idx_chat_participants_chat_id;
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_chat_settings_chat_id;

-- Step 3: Recreate chat_participants with TEXT chat_id
CREATE TABLE chat_participants_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'subscriber')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

INSERT INTO chat_participants_new (id, chat_id, user_id, role, joined_at)
SELECT id, chat_id::TEXT, user_id, role, joined_at
FROM chat_participants
ON CONFLICT DO NOTHING;

DROP TABLE chat_participants CASCADE;
ALTER TABLE chat_participants_new RENAME TO chat_participants;

-- Step 4: Recreate messages with TEXT chat_id
CREATE TABLE messages_new (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_message_id TEXT REFERENCES messages_new(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO messages_new (id, chat_id, user_id, content, reply_to_message_id, created_at, updated_at)
SELECT id, chat_id::TEXT, user_id, content, reply_to_message_id, created_at, updated_at
FROM messages
ON CONFLICT DO NOTHING;

DROP TABLE messages CASCADE;
ALTER TABLE messages_new RENAME TO messages;

-- Step 5: Recreate chat_settings with TEXT chat_id
CREATE TABLE chat_settings_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

INSERT INTO chat_settings_new (id, chat_id, user_id, is_muted, muted_until, created_at, updated_at)
SELECT id, chat_id::TEXT, user_id, is_muted, muted_until, created_at, updated_at
FROM chat_settings
ON CONFLICT DO NOTHING;

DROP TABLE chat_settings CASCADE;
ALTER TABLE chat_settings_new RENAME TO chat_settings;

-- Step 6: Recreate chats with TEXT id
CREATE TABLE chats_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO chats_new (id, name, description, type, created_at, updated_at)
SELECT id::TEXT, name, description, type, created_at, updated_at
FROM chats
ON CONFLICT DO NOTHING;

DROP TABLE chats CASCADE;
ALTER TABLE chats_new RENAME TO chats;

-- Step 7: Add foreign key constraints
ALTER TABLE chat_participants
  ADD CONSTRAINT fk_chat_participants_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE chat_settings
  ADD CONSTRAINT fk_chat_settings_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

-- Step 8: Recreate indexes
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

-- Step 9: Re-enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- Step 10: Recreate RLS policies for chats
CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Step 11: Recreate RLS policies for chat_participants
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

-- Step 12: Recreate RLS policies for messages
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

-- Step 13: Recreate RLS policies for chat_settings
CREATE POLICY "Users can view their own settings" ON chat_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON chat_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON chat_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
