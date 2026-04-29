import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { messages, chatParticipants } from '../drizzle/schema';
import { readFileSync } from 'fs';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';

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

  // Step 1: Create system user with UUID
  console.log('[Fix] Step 1: Creating system user...');
  const systemId = randomUUID();
  const systemEmail = 'system@rtrader.app';
  const passwordHash = await bcryptjs.hash('system-password-' + Date.now(), 10);
  
  try {
    await db.insert(authUsers).values({
      id: systemId,
      email: systemEmail,
      passwordHash: passwordHash,
    });
    console.log('[Fix] ✓ System user created');
  } catch (err: any) {
    if (err.message.includes('Duplicate')) {
      console.log('[Fix] ✓ System user already exists');
    } else {
      throw err;
    }
  }

  // Get system user ID
  const systemUsers = await db.select().from(authUsers);
  const systemUser = systemUsers.find(u => u.email === systemEmail);
  if (!systemUser) {
    console.error('[Fix] Failed to get system user');
    process.exit(1);
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
      // This is a failed message, re-import with system user UUID
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
      // This is a failed participant, re-import with system user UUID
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
