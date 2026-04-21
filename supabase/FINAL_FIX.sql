-- FINAL FIX: Recreate all tables with TEXT IDs
-- Step 1: Create new tables with correct schema
-- Step 2: Copy data
-- Step 3: Drop old tables
-- Step 4: Rename new tables
-- Step 5: Recreate constraints and indexes

-- ============================================================================
-- STEP 1: Create new tables with correct schema (WITHOUT data yet)
-- ============================================================================

CREATE TABLE chat_participants_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'subscriber')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE messages_new (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_message_id TEXT REFERENCES messages_new(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE chats_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 2: Copy data from old tables to new tables
-- ============================================================================

INSERT INTO chats_new (id, name, description, type, created_at, updated_at)
SELECT id::TEXT, name, description, type, created_at, updated_at
FROM chats
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants_new (id, chat_id, user_id, role, joined_at)
SELECT id, chat_id::TEXT, user_id, role, CURRENT_TIMESTAMP
FROM chat_participants
ON CONFLICT DO NOTHING;

INSERT INTO messages_new (id, chat_id, user_id, content, reply_to_message_id, created_at, updated_at)
SELECT id, chat_id::TEXT, user_id, content, reply_to_message_id, created_at, updated_at
FROM messages
ON CONFLICT DO NOTHING;

INSERT INTO chat_settings_new (id, chat_id, user_id, is_muted, muted_until, created_at, updated_at)
SELECT id, chat_id::TEXT, user_id, is_muted, muted_until, created_at, updated_at
FROM chat_settings
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Drop old tables
-- ============================================================================

DROP TABLE chat_participants CASCADE;
DROP TABLE messages CASCADE;
DROP TABLE chat_settings CASCADE;
DROP TABLE chats CASCADE;

-- ============================================================================
-- STEP 4: Rename new tables
-- ============================================================================

ALTER TABLE chats_new RENAME TO chats;
ALTER TABLE chat_participants_new RENAME TO chat_participants;
ALTER TABLE messages_new RENAME TO messages;
ALTER TABLE chat_settings_new RENAME TO chat_settings;

-- ============================================================================
-- STEP 5: Add foreign key constraints
-- ============================================================================

ALTER TABLE chat_participants
  ADD CONSTRAINT fk_chat_participants_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE chat_settings
  ADD CONSTRAINT fk_chat_settings_chat_id FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 6: Recreate indexes
-- ============================================================================

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

-- ============================================================================
-- STEP 7: Re-enable RLS
-- ============================================================================

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Recreate RLS policies
-- ============================================================================

CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );

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

CREATE POLICY "Users can view their own settings" ON chat_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON chat_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON chat_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
