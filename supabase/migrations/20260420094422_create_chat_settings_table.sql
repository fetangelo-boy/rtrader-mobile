-- Create chat_settings table for mute/unmute functionality
CREATE TABLE chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_chat_settings_chat_id ON chat_settings(chat_id);
CREATE INDEX idx_chat_settings_user_id ON chat_settings(user_id);
CREATE INDEX idx_chat_settings_muted ON chat_settings(is_muted);

-- Enable RLS
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view their own settings
CREATE POLICY "Users can view their own settings" ON chat_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON chat_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON chat_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
