-- Update chats table structure to support chat types and metadata
-- This migration adds name, description, type fields and updates_at

-- First, add new columns to chats table
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Migrate data from title to name (if title exists)
UPDATE chats SET name = title WHERE name IS NULL AND title IS NOT NULL;

-- Set default name for chats without title
UPDATE chats SET name = 'Chat ' || id WHERE name IS NULL;

-- Make name NOT NULL
ALTER TABLE chats
ALTER COLUMN name SET NOT NULL;

-- Add role column to chat_participants table
ALTER TABLE chat_participants
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'subscriber'));

-- Create index for chat type queries
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);

-- Update RLS policies for new structure
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can view their chat participants" ON chat_participants;

-- Create new RLS policies
CREATE POLICY "Users can view chats they participate in"
ON chats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = chats.id
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their chat participants"
ON chat_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND cp.user_id = auth.uid()
  )
);
