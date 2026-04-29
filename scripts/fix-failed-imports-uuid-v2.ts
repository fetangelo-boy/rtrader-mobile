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

async function fixImports() {
  const db = await getDb();
  if (!db) {
    console.error('[Fix] Database not available');
    process.exit(1);
  }

  console.log('[Fix] Starting fix for failed imports with UUID...\n');

  // Step 1: Get or create system user
  console.log('[Fix] Step 1: Getting system user...');
  let systemUser = (await db.select().from(authUsers).where(
    eq(authUsers.email, 'system@rtrader.app')
  ))[0];
  
  if (!systemUser) {
    console.log('[Fix] System user not found, using first available user');
    const allUsers = await db.select().from(authUsers);
    if (allUsers.length === 0) {
      console.error('[Fix] No users available');
      process.exit(1);
    }
    systemUser = allUsers[0];
  }
  
  const systemUserId = systemUser.id;
  console.log(`[Fix] System user ID: ${systemUserId}\n`);

  // Step 2: Re-import failed messages with UUID
  console.log('[Fix] Step 2: Re-importing failed messages...');
  const messagesData: SupabaseMessage[] = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
  
  let messageCount = 0;
  for (const msg of messagesData) {
    const userId = parseInt(msg.user_id);
    if (isNaN(userId)) {
      const chatId = parseInt(msg.chat_id);
      try {
        await db.insert(messages).values({
          chatId,
          userId: systemUserId,
          content: msg.content,
          createdAt: new Date(msg.created_at),
        });
        messageCount++;
      } catch (err: any) {
        if (!err.message.includes('Duplicate')) {
          console.error(`[Fix] Error importing message: ${err.message}`);
        }
      }
    }
  }
  console.log(`[Fix] ✓ Re-imported ${messageCount} messages\n`);

  // Step 3: Re-import failed participants with UUID
  console.log('[Fix] Step 3: Re-importing failed participants...');
  const participantsData: SupabaseChatParticipant[] = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));
  
  let participantCount = 0;
  for (const part of participantsData) {
    const userId = parseInt(part.user_id);
    if (isNaN(userId)) {
      const chatId = parseInt(part.chat_id);
      try {
        await db.insert(chatParticipants).values({
          chatId,
          userId: systemUserId,
          role: (part.role || 'participant') as any,
        });
        participantCount++;
      } catch (err: any) {
        if (!err.message.includes('Duplicate')) {
          console.error(`[Fix] Error importing participant: ${err.message}`);
        }
      }
    }
  }
  console.log(`[Fix] ✓ Re-imported ${participantCount} participants\n`);

  // Step 4: Verify
  console.log('[Fix] Step 4: Verifying final state...');
  const finalMessages = await db.select().from(messages);
  const finalParticipants = await db.select().from(chatParticipants);
  
  console.log(`[Fix] Final message count: ${finalMessages.length}`);
  console.log(`[Fix] Final participant count: ${finalParticipants.length}`);
  console.log('[Fix] ✓ Fix complete!');

  process.exit(0);
}

fixImports().catch(err => {
  console.error('[Fix] Error:', err);
  process.exit(1);
});
