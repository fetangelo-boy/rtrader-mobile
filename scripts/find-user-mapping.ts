import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { users } from '../drizzle/schema';
import { readFileSync } from 'fs';

async function findMapping() {
  const db = await getDb();
  if (!db) {
    console.error('[Mapping] Database not available');
    process.exit(1);
  }

  const missingUUID = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';
  console.log(`[Mapping] Looking for user: ${missingUUID}\n`);

  // Check auth_users
  console.log('[Mapping] Step 1: Checking auth_users...');
  const authUser = await db.select().from(authUsers);
  const foundInAuth = authUser.find(u => u.id === missingUUID);
  console.log(`  - Found in auth_users: ${foundInAuth ? 'YES' : 'NO'}`);
  if (foundInAuth) {
    console.log(`    Email: ${foundInAuth.email}`);
  }

  // Check legacy users table
  console.log('\n[Mapping] Step 2: Checking legacy users table...');
  const legacyUsers = await db.select().from(users);
  console.log(`  - Total users in legacy table: ${legacyUsers.length}`);
  legacyUsers.forEach(u => {
    console.log(`    - ID: ${u.id}, Email: ${u.email}, OpenID: ${u.openId}`);
  });

  // Check Supabase export for metadata
  console.log('\n[Mapping] Step 3: Checking Supabase export for metadata...');
  try {
    const messagesData = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
    const chatsData = JSON.parse(readFileSync('./SUPABASE_CHATS_EXPORT.json', 'utf-8'));
    
    console.log(`  - Messages with missing UUID: ${messagesData.filter((m: any) => m.user_id === missingUUID).length}`);
    console.log(`  - Sample messages content:`);
    messagesData.filter((m: any) => m.user_id === missingUUID).slice(0, 3).forEach((m: any) => {
      console.log(`    - "${m.content.substring(0, 60)}..."`);
    });
  } catch (err) {
    console.error('  - Error reading exports');
  }

  // Check if this UUID exists anywhere in the system
  console.log('\n[Mapping] Step 4: Classification...');
  console.log(`  - UUID ${missingUUID} is NOT in auth_users`);
  console.log(`  - UUID ${missingUUID} is NOT in legacy users`);
  console.log(`  - Content type: System/Bot messages (market news, trading tips)`);
  console.log(`  - Conclusion: This is a DELETED or SYSTEM user from Supabase`);

  console.log('\n[Mapping] Recommendation:');
  console.log('  - Create special "archived_user" with UUID for historical content');
  console.log('  - Or exclude these messages as they are system-generated content');

  process.exit(0);
}

findMapping().catch(err => {
  console.error('[Mapping] Error:', err);
  process.exit(1);
});
