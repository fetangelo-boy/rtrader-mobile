-- Create chat_participants table with MVP structure
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'subscriber')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_role ON chat_participants(role);

-- Enable RLS
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view participants of chats they're in
CREATE POLICY "Users can view participants of their chats" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.user_id = auth.uid()
    )
  );

-- RLS policy: users can view their own participation
CREATE POLICY "Users can view their own participation" ON chat_participants
  FOR SELECT USING (user_id = auth.uid());

-- RLS policy: admins can manage participants
CREATE POLICY "Admins can manage participants" ON chat_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
  );
