import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { messages, chatParticipants } from '../drizzle/schema';
import { readFileSync } from 'fs';
import { eq } from 'drizzle-orm';

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

async function finalReimport() {
  const db = await getDb();
  if (!db) {
    console.error('[Final] Database not available');
    process.exit(1);
  }

  const missingUserUUID = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';
  const correctEmail = 'test@rtrader.com';

  // Chat ID mapping
  const chatMapping: { [key: string]: number } = {
    'chat-1': 1,
    'chat-2': 2,
    'chat-3': 3,
    'chat-4': 4,
    'chat-5': 5,
    'chat-6': 6,
    'chat-7': 7,
    'chat-8': 8,
    '4198c604-083c-492e-a32b-9c25b39578c1': 9,
    '6d30606d-b155-4b2b-b814-ac9681a490f6': 10,
    '3d99dc01-e7da-4597-b072-57e950eef2e5': 11,
    '9beb6331-1bf7-4cb2-8169-35c001475ebc': 12,
  };

  console.log('[Final] Starting final re-import with correct mappings...\n');

  // Step 1: Get correct user
  console.log('[Final] Step 1: Finding correct user...');
  const correctUser = (await db.select().from(authUsers).where(
    eq(authUsers.email, correctEmail)
  ))[0];
  
  if (!correctUser) {
    console.error(`[Final] User ${correctEmail} not found`);
    process.exit(1);
  }
  
  const correctUserId = correctUser.id;
  console.log(`[Final] ✓ Found user: ${correctEmail} (ID: ${correctUserId})\n`);

  // Step 2: Re-import messages
  console.log('[Final] Step 2: Re-importing messages...');
  const messagesData: SupabaseMessage[] = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
  
  let messageCount = 0;
  let messageSkipped = 0;
  let messageError = 0;
  
  for (const msg of messagesData) {
    if (msg.user_id === missingUserUUID) {
      const supabaseChatId = msg.chat_id;
      const mysqlChatId = chatMapping[supabaseChatId];
      
      if (!mysqlChatId) {
        console.error(`[Final] Unknown chat ID: ${supabaseChatId}`);
        messageError++;
        continue;
      }
      
      try {
        await db.insert(messages).values({
          chatId: mysqlChatId,
          userId: correctUserId,
          content: msg.content,
          createdAt: new Date(msg.created_at),
        });
        messageCount++;
      } catch (err: any) {
        if (err.message.includes('Duplicate')) {
          messageSkipped++;
        } else {
          console.error(`[Final] Error importing message: ${err.message}`);
          messageError++;
        }
      }
    }
  }
  console.log(`[Final] ✓ Re-imported ${messageCount} messages (${messageSkipped} duplicates, ${messageError} errors)\n`);

  // Step 3: Re-import participants
  console.log('[Final] Step 3: Re-importing participants...');
  const participantsData: SupabaseChatParticipant[] = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));
  
  let participantCount = 0;
  let participantSkipped = 0;
  let participantError = 0;
  
  for (const part of participantsData) {
    if (part.user_id === missingUserUUID) {
      const supabaseChatId = part.chat_id;
      const mysqlChatId = chatMapping[supabaseChatId];
      
      if (!mysqlChatId) {
        console.error(`[Final] Unknown chat ID: ${supabaseChatId}`);
        participantError++;
        continue;
      }
      
      try {
        await db.insert(chatParticipants).values({
          chatId: mysqlChatId,
          userId: correctUserId,
          role: (part.role || 'participant') as any,
        });
        participantCount++;
      } catch (err: any) {
        if (err.message.includes('Duplicate')) {
          participantSkipped++;
        } else {
          console.error(`[Final] Error importing participant: ${err.message}`);
          participantError++;
        }
      }
    }
  }
  console.log(`[Final] ✓ Re-imported ${participantCount} participants (${participantSkipped} duplicates, ${participantError} errors)\n`);

  // Step 4: Verify
  console.log('[Final] Step 4: Verifying final state...');
  const finalMessages = await db.select().from(messages);
  const finalParticipants = await db.select().from(chatParticipants);
  
  console.log(`[Final] Final message count: ${finalMessages.length}`);
  console.log(`[Final] Final participant count: ${finalParticipants.length}`);
  
  // Verify messages from test@rtrader.com
  const testUserMessages = finalMessages.filter(m => m.userId === correctUserId);
  console.log(`[Final] Messages from test@rtrader.com: ${testUserMessages.length}`);
  
  console.log('[Final] ✓ Final re-import complete!');

  process.exit(0);
}

finalReimport().catch(err => {
  console.error('[Final] Error:', err);
  process.exit(1);
});
