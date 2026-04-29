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
  const messagesData: SupabaseMessage[] = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
  const participantsData: SupabaseChatParticipant[] = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));

  console.log('[Analysis] Analyzing failed imports...\n');

  // Analyze messages
  console.log('[Analysis] MESSAGES ANALYSIS:');
  const failedMessages: Record<string, SupabaseMessage[]> = {};
  const validMessages: Record<string, SupabaseMessage[]> = {};

  for (const msg of messagesData) {
    const userId = parseInt(msg.user_id);
    if (isNaN(userId)) {
      if (!failedMessages[msg.chat_id]) failedMessages[msg.chat_id] = [];
      failedMessages[msg.chat_id].push(msg);
    } else {
      if (!validMessages[msg.chat_id]) validMessages[msg.chat_id] = [];
      validMessages[msg.chat_id].push(msg);
    }
  }

  console.log(`Total messages: ${messagesData.length}`);
  console.log(`Valid (numeric user_id): ${Object.values(validMessages).flat().length}`);
  console.log(`Failed (non-numeric user_id): ${Object.values(failedMessages).flat().length}`);

  console.log('\nFailed messages by chat:');
  for (const [chatId, msgs] of Object.entries(failedMessages)) {
    console.log(`  Chat ${chatId}: ${msgs.length} failed`);
    msgs.slice(0, 2).forEach(m => {
      console.log(`    - user_id="${m.user_id}" (type: ${typeof m.user_id}), content: "${m.content.substring(0, 40)}..."`);
    });
  }

  // Analyze participants
  console.log('\n[Analysis] PARTICIPANTS ANALYSIS:');
  const failedParticipants: Record<string, SupabaseChatParticipant[]> = {};
  const validParticipants: Record<string, SupabaseChatParticipant[]> = {};

  for (const part of participantsData) {
    const userId = parseInt(part.user_id);
    if (isNaN(userId)) {
      if (!failedParticipants[part.chat_id]) failedParticipants[part.chat_id] = [];
      failedParticipants[part.chat_id].push(part);
    } else {
      if (!validParticipants[part.chat_id]) validParticipants[part.chat_id] = [];
      validParticipants[part.chat_id].push(part);
    }
  }

  console.log(`Total participants: ${participantsData.length}`);
  console.log(`Valid (numeric user_id): ${Object.values(validParticipants).flat().length}`);
  console.log(`Failed (non-numeric user_id): ${Object.values(failedParticipants).flat().length}`);

  console.log('\nFailed participants by chat:');
  for (const [chatId, parts] of Object.entries(failedParticipants)) {
    console.log(`  Chat ${chatId}: ${parts.length} failed`);
    parts.forEach(p => {
      console.log(`    - user_id="${p.user_id}" (type: ${typeof p.user_id}), role: ${p.role}`);
    });
  }

  // Sample failed message content
  console.log('\n[Analysis] SAMPLE FAILED MESSAGE CONTENT:');
  const allFailed = Object.values(failedMessages).flat();
  allFailed.slice(0, 5).forEach(m => {
    console.log(`  Chat ${m.chat_id}: "${m.content}"`);
  });

  process.exit(0);
}

analyze().catch(console.error);
