import { getDb } from '../server/db';

async function check() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    process.exit(1);
  }

  const result = await db.execute(`SHOW TABLES`);
  console.log('Tables in database:');
  result.rows.forEach((row: any) => {
    const tableName = Object.values(row)[0];
    console.log('  -', tableName);
  });
  
  process.exit(0);
}

check().catch(console.error);
