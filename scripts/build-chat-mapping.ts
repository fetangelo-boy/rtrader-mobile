import { getDb } from '../server/db';
import { chats } from '../drizzle/schema';
import { readFileSync } from 'fs';

async function buildMapping() {
  const db = await getDb();
  if (!db) {
    console.error('[Mapping] Database not available');
    process.exit(1);
  }

  console.log('[Mapping] Building chat ID mapping...\n');

  // Get all chats from MySQL
  const mysqlChats = await db.select().from(chats);
  console.log('[Mapping] MySQL chats:');
  mysqlChats.forEach(c => {
    console.log(`  - ID: ${c.id}, Name: ${c.name}`);
  });

  // Get all chats from Supabase export
  console.log('\n[Mapping] Supabase export chats:');
  const chatsData = JSON.parse(readFileSync('./SUPABASE_CHATS_EXPORT.json', 'utf-8'));
  chatsData.forEach((c: any) => {
    console.log(`  - ID: ${c.id}, Name: ${c.name}`);
  });

  // Build mapping based on name
  console.log('\n[Mapping] Building mapping by name:');
  const mapping: { [key: string]: number } = {};
  
  for (const supabaseChat of chatsData) {
    const matchingMysqlChat = mysqlChats.find(mc => mc.name === supabaseChat.name);
    if (matchingMysqlChat) {
      mapping[supabaseChat.id] = matchingMysqlChat.id;
      console.log(`  ✓ "${supabaseChat.id}" → ${matchingMysqlChat.id} (${supabaseChat.name})`);
    } else {
      console.log(`  ✗ "${supabaseChat.id}" → NOT FOUND (${supabaseChat.name})`);
    }
  }

  console.log('\n[Mapping] Mapping complete!');
  console.log(JSON.stringify(mapping, null, 2));

  process.exit(0);
}

buildMapping().catch(err => {
  console.error('[Mapping] Error:', err);
  process.exit(1);
});
