import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { eq } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    process.exit(1);
  }
  
  const uuid = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';
  const user = await db.select().from(authUsers).where(eq(authUsers.email, uuid));
  
  console.log('[Check] UUID user in auth_users:', user.length > 0 ? 'YES' : 'NO');
  
  const allUsers = await db.select().from(authUsers);
  console.log('[Check] Total users in auth_users:', allUsers.length);
  allUsers.forEach(u => console.log('  -', u.email));
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
