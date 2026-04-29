import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

async function applyMigration() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    // Read the migration SQL
    const sql = readFileSync('./drizzle/0004_lonely_bloodscream.sql', 'utf-8');
    
    console.log('[Migration] Applying migration...');
    console.log(sql);
    
    // Execute the SQL
    await connection.execute(sql);
    
    console.log('[Migration] ✓ Migration applied successfully');
  } catch (error) {
    console.error('[Migration] ✗ Error:', error);
  } finally {
    await connection.end();
  }
}

applyMigration();
