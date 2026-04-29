import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { readdirSync } from 'fs';

async function applyMigrations() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    // Get all SQL files sorted by name
    const sqlFiles = readdirSync('./drizzle')
      .filter(f => f.endsWith('.sql') && !f.startsWith('_'))
      .sort();

    console.log(`[Migration] Found ${sqlFiles.length} migration files`);

    for (const file of sqlFiles) {
      const sql = readFileSync(`./drizzle/${file}`, 'utf-8');
      console.log(`[Migration] Applying ${file}...`);
      
      // Split by statement-breakpoint and execute each
      const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
      
      for (const stmt of statements) {
        try {
          await connection.execute(stmt);
          console.log(`[Migration] ✓ ${stmt.substring(0, 50)}...`);
        } catch (error: any) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`[Migration] ⊘ Table already exists`);
          } else {
            console.error(`[Migration] ✗ Error:`, error.message);
          }
        }
      }
    }

    console.log('[Migration] All migrations applied');
  } finally {
    await connection.end();
  }
}

applyMigrations();
