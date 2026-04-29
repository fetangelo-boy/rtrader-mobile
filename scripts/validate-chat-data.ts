import { getDb } from '../server/db';
import { chats, messages, chatParticipants } from '../drizzle/schema';

async function validate() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }
  
  const chatCount = await db.select().from(chats);
  const msgCount = await db.select().from(messages);
  const partCount = await db.select().from(chatParticipants);
  
  console.log('[Validation] Chat data in MySQL:');
  console.log(`[Validation] ✓ Chats: ${chatCount.length}`);
  console.log(`[Validation] ✓ Messages: ${msgCount.length}`);
  console.log(`[Validation] ✓ Participants: ${partCount.length}`);
  
  if (chatCount.length > 0) {
    console.log(`[Validation] Sample chat: "${chatCount[0].name}"`);
  }
  
  process.exit(0);
}

validate().catch(err => {
  console.error('[Validation] Error:', err);
  process.exit(1);
});
