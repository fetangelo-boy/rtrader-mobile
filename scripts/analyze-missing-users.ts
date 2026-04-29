import { readFileSync } from 'fs';

interface SupabaseMessage {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface SupabaseChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  role?: string;
}

async function analyze() {
  console.log('[Analyze] Finding all missing user IDs...\n');

  const messagesData: SupabaseMessage[] = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
  const participantsData: SupabaseChatParticipant[] = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));

  // Find all missing user IDs
  const missingUserIds = new Set<string>();
  const missingMessagesByUserId: { [key: string]: SupabaseMessage[] } = {};
  const missingParticipantsByUserId: { [key: string]: SupabaseChatParticipant[] } = {};

  // Analyze messages
  for (const msg of messagesData) {
    const userId = parseInt(msg.user_id);
    if (isNaN(userId)) {
      missingUserIds.add(msg.user_id);
      if (!missingMessagesByUserId[msg.user_id]) {
        missingMessagesByUserId[msg.user_id] = [];
      }
      missingMessagesByUserId[msg.user_id].push(msg);
    }
  }

  // Analyze participants
  for (const part of participantsData) {
    const userId = parseInt(part.user_id);
    if (isNaN(userId)) {
      missingUserIds.add(part.user_id);
      if (!missingParticipantsByUserId[part.user_id]) {
        missingParticipantsByUserId[part.user_id] = [];
      }
      missingParticipantsByUserId[part.user_id].push(part);
    }
  }

  console.log(`[Analyze] Found ${missingUserIds.size} unique missing user IDs\n`);

  for (const userId of Array.from(missingUserIds)) {
    const msgCount = missingMessagesByUserId[userId]?.length || 0;
    const partCount = missingParticipantsByUserId[userId]?.length || 0;
    console.log(`[Analyze] User ID: ${userId}`);
    console.log(`  - Messages: ${msgCount}`);
    console.log(`  - Participants: ${partCount}`);
    
    if (msgCount > 0) {
      const sample = missingMessagesByUserId[userId][0];
      console.log(`  - Sample message: "${sample.content.substring(0, 50)}..."`);
      console.log(`  - Created: ${sample.created_at}`);
    }
    console.log();
  }

  console.log(`[Analyze] Summary:`);
  console.log(`  - Total missing messages: ${Object.values(missingMessagesByUserId).flat().length}`);
  console.log(`  - Total missing participants: ${Object.values(missingParticipantsByUserId).flat().length}`);
}

analyze().catch(console.error);
