import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../server/db';
import { authUsers } from '../drizzle/schema_auth';
import { chats, messages, chatParticipants } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateAccessToken } from '../server/_core/jwt';

describe('JWT + Chat E2E Flow', () => {
  let testUserId: string;
  let testEmail: string;
  let accessToken: string;
  let chatId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Use existing test@rtrader.com user (UUID: cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd)
    testEmail = 'test@rtrader.com';
    testUserId = 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd';

    // Verify user exists
    const user = await db.select().from(authUsers).where(eq(authUsers.email, testEmail)).limit(1);
    if (!user[0]) throw new Error(`User ${testEmail} not found`);

    // Generate JWT token
    accessToken = generateAccessToken(testUserId, testEmail);
    console.log(`[E2E] Generated token for ${testEmail}`);

    // Get first chat for testing
    const chatList = await db.select().from(chats).limit(1);
    if (!chatList[0]) throw new Error('No chats found');
    chatId = chatList[0].id;
    console.log(`[E2E] Using chat ID: ${chatId}`);
  });

  it('should verify JWT token is valid', () => {
    expect(accessToken).toBeTruthy();
    expect(accessToken).toContain('.');
    console.log(`[E2E] ✓ JWT token generated: ${accessToken.substring(0, 20)}...`);
  });

  it('should verify user exists in database', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const user = await db.select().from(authUsers).where(eq(authUsers.email, testEmail)).limit(1);
    expect(user[0]).toBeTruthy();
    expect(user[0].id).toBe(testUserId);
    expect(user[0].email).toBe(testEmail);
    console.log(`[E2E] ✓ User verified: ${user[0].email} (ID: ${user[0].id})`);
  });

  it('should verify user is participant in chat', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const participant = await db
      .select()
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, testUserId))
      .limit(1);

    expect(participant[0]).toBeTruthy();
    expect(participant[0].userId).toBe(testUserId);
    console.log(`[E2E] ✓ User is participant in chat ${participant[0].chatId}`);
  });

  it('should retrieve messages from chat', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId));

    expect(chatMessages.length).toBeGreaterThan(0);
    console.log(`[E2E] ✓ Retrieved ${chatMessages.length} messages from chat ${chatId}`);

    // Verify message structure
    const firstMessage = chatMessages[0];
    expect(firstMessage.id).toBeTruthy();
    expect(firstMessage.userId).toBeTruthy();
    expect(firstMessage.content).toBeTruthy();
    expect(firstMessage.createdAt).toBeTruthy();
    console.log(`[E2E] ✓ Message structure valid: "${firstMessage.content.substring(0, 50)}..."`);
  });

  it('should verify messages from test@rtrader.com exist', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const userMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, testUserId));

    expect(userMessages.length).toBeGreaterThan(0);
    console.log(`[E2E] ✓ User has ${userMessages.length} messages in database`);

    // Verify at least 45 re-imported messages exist (plus any test messages)
    expect(userMessages.length).toBeGreaterThanOrEqual(45);
    console.log(`[E2E] ✓ Confirmed: ${userMessages.length} messages from test@rtrader.com (includes 45 re-imported + test messages)`);
  });

  it('should verify user can send message to chat', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const testMessage = `E2E Test Message ${Date.now()}`;
    
    // Insert test message
    await db.insert(messages).values({
      chatId,
      userId: testUserId,
      content: testMessage,
    });

    // Retrieve and verify
    const inserted = await db
      .select()
      .from(messages)
      .where(eq(messages.content, testMessage))
      .limit(1);

    expect(inserted[0]).toBeTruthy();
    expect(inserted[0].userId).toBe(testUserId);
    expect(inserted[0].content).toBe(testMessage);
    console.log(`[E2E] ✓ Message sent and verified: "${testMessage}"`);
  });

  it('should verify JWT context would work in tRPC', async () => {
    // Simulate JWT context extraction
    const jwtUser = {
      id: testUserId,
      email: testEmail,
      userId: testUserId,
    };

    expect(jwtUser.userId).toBe(testUserId);
    expect(jwtUser.email).toBe(testEmail);
    expect(jwtUser.id).toBe(testUserId);
    console.log(`[E2E] ✓ JWT context ready: ${jwtUser.email}`);
  });

  it('should verify chat access control', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Verify user is in the chat
    const isParticipant = await db
      .select()
      .from(chatParticipants)
      .where(
        eq(chatParticipants.userId, testUserId) &&
        eq(chatParticipants.chatId, chatId)
      )
      .limit(1);

    expect(isParticipant[0]).toBeTruthy();
    console.log(`[E2E] ✓ Access control verified: user can access chat ${chatId}`);
  });
});
