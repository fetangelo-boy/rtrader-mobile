import { readFileSync } from 'fs';
import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { hashPassword } from '../server/_core/jwt';

interface SupabaseUser {
  id: string;
  email: string;
}

async function importUsers() {
  console.log('[Import] Starting user import from Supabase export...');

  try {
    // Read the export file
    const exportPath = './SUPABASE_USERS_EXPORT.json';
    const fileContent = readFileSync(exportPath, 'utf-8');
    const users: SupabaseUser[] = JSON.parse(fileContent);

    console.log(`[Import] Found ${users.length} users to import`);

    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    let successCount = 0;
    let skipCount = 0;

    for (const user of users) {
      try {
        // Generate a temporary password (users will need to reset)
        const tempPassword = `temp_${user.id.slice(0, 8)}_${Math.random().toString(36).substr(2, 9)}`;
        const passwordHash = await hashPassword(tempPassword);

        // Insert user into auth_users
        await db.insert(authUsers).values({
          id: user.id,
          email: user.email,
          passwordHash,
        });

        console.log(`[Import] ✓ Imported user: ${user.email}`);
        successCount++;
      } catch (error: any) {
        if (error.message?.includes('Duplicate entry')) {
          console.log(`[Import] ⊘ Skipped (already exists): ${user.email}`);
          skipCount++;
        } else {
          console.error(`[Import] ✗ Failed to import ${user.email}:`, error.message);
        }
      }
    }

    console.log(`\n[Import] Import complete!`);
    console.log(`[Import] Successfully imported: ${successCount}`);
    console.log(`[Import] Skipped (duplicates): ${skipCount}`);
    console.log(`[Import] Total: ${users.length}`);

    process.exit(0);
  } catch (error) {
    console.error('[Import] Fatal error:', error);
    process.exit(1);
  }
}

importUsers();
