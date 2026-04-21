-- Fix chats table schema to match MVP requirements
-- This script modifies the existing chats table to have correct columns

-- Step 1: Drop existing policies on chats table
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;

-- Step 2: Add missing columns to chats table
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 3: Drop old columns if they exist (title, is_group)
ALTER TABLE chats
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS is_group;

-- Step 4: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);

-- Step 5: Re-enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Step 6: Recreate RLS policy
CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );
