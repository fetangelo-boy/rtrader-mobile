import { getDb } from '../server/db';
import { chats } from '../drizzle/schema';

async function test() {
  const db = await getDb();
  console.log('DB:', db ? 'connected' : 'not connected');
  
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }
  
  const result = await db.select().from(chats).limit(5);
  console.log('Existing chats:', result.length);
  result.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));
}

test().catch(console.error);
