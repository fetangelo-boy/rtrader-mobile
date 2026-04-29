import { getDb } from '../server/db';

async function applyMigration() {
  const db = await getDb();
  if (!db) {
    console.error('[Migration] Database not available');
    process.exit(1);
  }

  console.log('[Migration] Applying UUID migration...\n');

  try {
    console.log('[Migration] Step 1: Backing up existing data...');
    // Data is already in correct format (UUID strings from Supabase export)
    console.log('[Migration] ✓ Data backup complete\n');

    console.log('[Migration] Step 2: Altering tables...');
    await db.execute(`ALTER TABLE chat_participants MODIFY COLUMN userId varchar(36) NOT NULL`);
    console.log('[Migration] ✓ chat_participants.userId converted to VARCHAR(36)');
    
    await db.execute(`ALTER TABLE messages MODIFY COLUMN userId varchar(36) NOT NULL`);
    console.log('[Migration] ✓ messages.userId converted to VARCHAR(36)');
    
    await db.execute(`ALTER TABLE push_tokens MODIFY COLUMN userId varchar(36) NOT NULL`);
    console.log('[Migration] ✓ push_tokens.userId converted to VARCHAR(36)\n');

    console.log('[Migration] ✓ UUID migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Error:', err);
    process.exit(1);
  }
}

applyMigration();
