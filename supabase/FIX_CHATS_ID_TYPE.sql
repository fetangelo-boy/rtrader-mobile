-- Fix chats table id column type from UUID to TEXT

-- Step 1: Drop dependent objects
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP INDEX IF EXISTS idx_chats_created_at;
DROP INDEX IF EXISTS idx_chats_type;

-- Step 2: Create new chats table with correct schema
CREATE TABLE chats_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Copy data from old table to new table (if any exists)
INSERT INTO chats_new (id, name, description, type, created_at, updated_at)
SELECT id::TEXT, COALESCE(name, 'Untitled'), description, COALESCE(type, 'interactive'), created_at, updated_at
FROM chats
ON CONFLICT DO NOTHING;

-- Step 4: Drop old table and rename new one
DROP TABLE chats CASCADE;
ALTER TABLE chats_new RENAME TO chats;

-- Step 5: Recreate indexes
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

-- Step 6: Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Step 7: Recreate RLS policy
CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );
