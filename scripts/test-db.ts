import { drizzle } from 'drizzle-orm/mysql2';
import { authUsers } from '../drizzle/schema_auth';

async function testDb() {
  try {
    const db = drizzle(process.env.DATABASE_URL!);
    const result = await db.select().from(authUsers).limit(1);
    console.log('✓ Table exists and is accessible');
    console.log('Current rows:', result.length);
    process.exit(0);
  } catch (error) {
    console.error('✗ Database error:', error);
    process.exit(1);
  }
}

testDb();
