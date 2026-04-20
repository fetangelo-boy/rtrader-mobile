-- Create chats table with MVP structure
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'interactive' CHECK (type IN ('interactive', 'info_only')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view chats they participate in
CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );
