-- Fix chats table: change id from UUID to TEXT

-- Drop all RLS policies first
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;

-- Recreate chats table with TEXT id
CREATE TABLE chats_fixed (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data from old table
INSERT INTO chats_fixed (id, name, description, type, created_at, updated_at)
SELECT id::TEXT, name, description, type, created_at, updated_at
FROM chats
ON CONFLICT DO NOTHING;

-- Drop old table and rename new one
DROP TABLE chats CASCADE;
ALTER TABLE chats_fixed RENAME TO chats;

-- Recreate indexes
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

-- Recreate RLS policy
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );
