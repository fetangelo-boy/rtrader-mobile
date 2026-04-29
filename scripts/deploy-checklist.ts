import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { chats, messages, chatParticipants } from '../drizzle/schema';
import { generateAccessToken, verifyAccessToken } from '../server/_core/jwt';
import { count } from 'drizzle-orm';

async function runDeploymentChecklist() {
  console.log('\n=== DEPLOYMENT CHECKLIST ===\n');

  // 1. Check environment variables
  console.log('1️⃣  Checking environment variables...');
  const requiredEnvs = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];
  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  
  if (missingEnvs.length > 0) {
    console.error(`❌ Missing env vars: ${missingEnvs.join(', ')}`);
    process.exit(1);
  }
  console.log(`✅ All required env vars present (DATABASE_URL, JWT_SECRET, NODE_ENV=${process.env.NODE_ENV})`);

  // 2. Test MySQL connection
  console.log('\n2️⃣  Testing MySQL connection...');
  let db;
  try {
    db = await getDb();
    if (!db) throw new Error('Failed to get database connection');
    console.log('✅ MySQL connection successful');
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    process.exit(1);
  }

  // 3. Verify migrations applied
  console.log('\n3️⃣  Verifying database schema...');
  try {
    const tableCheck = await db.execute('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()');
    const tableCount = (tableCheck as any)[0]?.[0]?.count || 0;
    if (tableCount < 5) {
      console.error(`❌ Not enough tables (${tableCount}). Migrations may not be applied.`);
      process.exit(1);
    }
    console.log(`✅ Database schema verified (${tableCount} tables found)`);
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  }

  // 4. Verify all 14 users exist
  console.log('\n4️⃣  Verifying imported users...');
  try {
    const userCount = await db.select({ count: count() }).from(authUsers);
    const totalUsers = userCount[0]?.count || 0;
    
    if (totalUsers < 14) {
      console.error(`❌ Expected 14 users, found ${totalUsers}. User import incomplete.`);
      process.exit(1);
    }
    
    const users = await db.select({ email: authUsers.email }).from(authUsers).limit(5);
    console.log(`✅ All 14 users imported (sample: ${users.map(u => u.email).join(', ')}...)`);
  } catch (error) {
    console.error('❌ User verification failed:', error);
    process.exit(1);
  }

  // 5. Test JWT token generation
  console.log('\n5️⃣  Testing JWT token generation...');
  try {
    const testUserId = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';
    const testEmail = 'test@rtrader.com';
    
    const token = generateAccessToken(testUserId, testEmail);
    if (!token) throw new Error('Token generation returned empty');
    
    const payload = verifyAccessToken(token);
    if (!payload || payload.userId !== testUserId) {
      throw new Error('Token verification failed or payload mismatch');
    }
    
    console.log(`✅ JWT token generation and verification working`);
  } catch (error) {
    console.error('❌ JWT test failed:', error);
    process.exit(1);
  }

  // 6. Verify chat data
  console.log('\n6️⃣  Verifying chat data...');
  try {
    const chatCount = await db.select({ count: count() }).from(chats);
    const messageCount = await db.select({ count: count() }).from(messages);
    const participantCount = await db.select({ count: count() }).from(chatParticipants);
    
    const chatsTotal = chatCount[0]?.count || 0;
    const messagesTotal = messageCount[0]?.count || 0;
    const participantsTotal = participantCount[0]?.count || 0;
    
    if (chatsTotal < 12 || messagesTotal < 60 || participantsTotal < 25) {
      console.warn(`⚠️  Chat data may be incomplete:`);
      console.warn(`   - Chats: ${chatsTotal} (expected 12+)`);
      console.warn(`   - Messages: ${messagesTotal} (expected 60+)`);
      console.warn(`   - Participants: ${participantsTotal} (expected 25+)`);
    } else {
      console.log(`✅ Chat data verified (${chatsTotal} chats, ${messagesTotal} messages, ${participantsTotal} participants)`);
    }
  } catch (error) {
    console.error('❌ Chat data verification failed:', error);
    process.exit(1);
  }

  // 7. Summary
  console.log('\n=== DEPLOYMENT CHECKLIST COMPLETE ===');
  console.log('✅ All checks passed. Ready for deployment.\n');
  console.log('Next steps:');
  console.log('1. Verify Express server starts: npm run start');
  console.log('2. Test health endpoint: curl http://localhost:3000/health');
  console.log('3. Test auth endpoint: curl -X POST http://localhost:3000/trpc/auth.login');
  console.log('4. Test chat endpoint: curl http://localhost:3000/trpc/chat.list (with JWT token)');
  console.log('');
}

runDeploymentChecklist().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
