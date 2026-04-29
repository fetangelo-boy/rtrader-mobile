import { readFileSync } from 'fs';

async function check() {
  console.log('[Check] Analyzing chat IDs...\n');

  const messagesData = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
  const participantsData = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));

  const missingUUID = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';

  // Get messages with missing UUID
  const missingMessages = messagesData.filter((m: any) => m.user_id === missingUUID);
  
  console.log('[Check] Sample messages with missing UUID:');
  missingMessages.slice(0, 5).forEach((m: any) => {
    const chatId = parseInt(m.chat_id);
    console.log(`  - chat_id: "${m.chat_id}" → parseInt: ${chatId} (isNaN: ${isNaN(chatId)})`);
  });

  console.log('\n[Check] Sample participants with missing UUID:');
  const missingParticipants = participantsData.filter((p: any) => p.user_id === missingUUID);
  missingParticipants.slice(0, 5).forEach((p: any) => {
    const chatId = parseInt(p.chat_id);
    console.log(`  - chat_id: "${p.chat_id}" → parseInt: ${chatId} (isNaN: ${isNaN(chatId)})`);
  });
}

check().catch(console.error);
