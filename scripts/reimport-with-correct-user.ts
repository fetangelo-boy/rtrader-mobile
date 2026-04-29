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

async function reimport() {
  const db = await getDb();
  if (!db) {
    console.error('[Reimport] Database not available');
    process.exit(1);
  }

  const missingUUID = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';
  const correctEmail = 'test@rtrader.com';

  console.log('[Reimport] Starting re-import with correct user mapping...\n');

  // Step 1: Get correct user
  console.log('[Reimport] Step 1: Finding correct user...');
  const correctUser = (await db.select().from(authUsers).where(
    eq(authUsers.email, correctEmail)
  ))[ 0];
  
  if (!correctUser) {
    console.error(`[Reimport] User ${correctEmail} not found`);
    process.exit(1);
  }
  
  const correctUserId = correctUser.id;
  console.log(`[Reimport] ✓ Found user: ${correctEmail} (ID: ${correctUserId})\n`);

  // Step 2: Re-import messages
  console.log('[Reimport] Step 2: Re-importing messages...');
  const messagesData: SupabaseMessage[] = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
  
  let messageCount = 0;
  let messageSkipped = 0;
  for (const msg of messagesData) {
    if (msg.user_id === missingUUID) {
      const chatId = parseInt(msg.chat_id);
      try {
        await db.insert(messages).values({
          chatId,
          userId: correctUserId,
          content: msg.content,
          createdAt: new Date(msg.created_at),
        });
        messageCount++;
      } catch (err: any) {
        if (err.message.includes('Duplicate')) {
          messageSkipped++;
        } else {
          console.error(`[Reimport] Error importing message: ${err.message}`);
        }
      }
    }
  }
  console.log(`[Reimport] ✓ Re-imported ${messageCount} messages (${messageSkipped} duplicates skipped)\n`);

  // Step 3: Re-import participants
  console.log('[Reimport] Step 3: Re-importing participants...');
  const participantsData: SupabaseChatParticipant[] = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));
  
  let participantCount = 0;
  let participantSkipped = 0;
  for (const part of participantsData) {
    if (part.user_id === missingUUID) {
      const chatId = parseInt(part.chat_id);
      try {
        await db.insert(chatParticipants).values({
          chatId,
          userId: correctUserId,
          role: (part.role || 'participant') as any,
        });
        participantCount++;
      } catch (err: any) {
        if (err.message.includes('Duplicate')) {
          participantSkipped++;
        } else {
          console.error(`[Reimport] Error importing participant: ${err.message}`);
        }
      }
    }
  }
  console.log(`[Reimport] ✓ Re-imported ${participantCount} participants (${participantSkipped} duplicates skipped)\n`);

  // Step 4: Verify
  console.log('[Reimport] Step 4: Verifying final state...');
  const finalMessages = await db.select().from(messages);
  const finalParticipants = await db.select().from(chatParticipants);
  
  console.log(`[Reimport] Final message count: ${finalMessages.length}`);
  console.log(`[Reimport] Final participant count: ${finalParticipants.length}`);
  
  // Verify messages from test@rtrader.com
  const testUserMessages = finalMessages.filter(m => m.userId === correctUserId);
  console.log(`[Reimport] Messages from test@rtrader.com: ${testUserMessages.length}`);
  
  console.log('[Reimport] ✓ Re-import complete!');

  process.exit(0);
}

reimport().catch(err => {
  console.error('[Reimport] Error:', err);
  process.exit(1);
});
