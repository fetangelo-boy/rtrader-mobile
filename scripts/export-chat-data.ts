import { getServerSupabase } from '../lib/supabase';

async function exportChatData() {
  const supabase = getServerSupabase();

  try {
    console.log('[Export] Starting chat data export from Supabase...');

    // Export chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*');

    if (chatsError) throw new Error(`Failed to export chats: ${chatsError.message}`);
    console.log(`[Export] ✓ Exported ${chats?.length || 0} chats`);

    // Export messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*');

    if (messagesError) throw new Error(`Failed to export messages: ${messagesError.message}`);
    console.log(`[Export] ✓ Exported ${messages?.length || 0} messages`);

    // Export chat_participants
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('*');

    if (participantsError) throw new Error(`Failed to export participants: ${participantsError.message}`);
    console.log(`[Export] ✓ Exported ${participants?.length || 0} chat participants`);

    // Save to files
    const fs = await import('fs').then(m => m.promises);
    
    await fs.writeFile(
      './SUPABASE_CHATS_EXPORT.json',
      JSON.stringify(chats, null, 2)
    );
    await fs.writeFile(
      './SUPABASE_MESSAGES_EXPORT.json',
      JSON.stringify(messages, null, 2)
    );
    await fs.writeFile(
      './SUPABASE_CHAT_PARTICIPANTS_EXPORT.json',
      JSON.stringify(participants, null, 2)
    );

    console.log('[Export] ✓ All data exported to JSON files');
    console.log(`[Export] Total: ${chats?.length || 0} chats, ${messages?.length || 0} messages, ${participants?.length || 0} participants`);

    process.exit(0);
  } catch (error) {
    console.error('[Export] Fatal error:', error);
    process.exit(1);
  }
}

exportChatData();
