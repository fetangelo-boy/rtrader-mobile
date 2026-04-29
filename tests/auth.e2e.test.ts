import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getDb } from "../server/db";
import { authUsers } from "../drizzle/schema_auth";
import { eq } from "drizzle-orm";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
} from "../server/_core/jwt";

describe("JWT Auth E2E Flow", () => {
  const testEmail = "e2e-test@rtrader.app";
  const testPassword = "TestPassword123!";
  let testUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up any existing test user
    await db.delete(authUsers).where(eq(authUsers.email, testEmail)).catch(() => {});
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test user
    await db.delete(authUsers).where(eq(authUsers.email, testEmail)).catch(() => {});
  });

  it("should hash and verify passwords correctly", async () => {
    const password = "MySecurePassword123!";
    const hash = await hashPassword(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);

    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword("WrongPassword", hash);
    expect(isInvalid).toBe(false);
  });

  it("should generate and verify access tokens", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const email = "test@example.com";

    const token = generateAccessToken(userId, email);
    expect(token).toBeTruthy();

    const payload = verifyAccessToken(token);
    expect(payload).toBeTruthy();
    expect(payload?.userId).toBe(userId);
    expect(payload?.email).toBe(email);
  });

  it("should generate and verify refresh tokens", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const email = "test@example.com";

    const token = generateRefreshToken(userId, email);
    expect(token).toBeTruthy();

    const payload = verifyRefreshToken(token);
    expect(payload).toBeTruthy();
    expect(payload?.userId).toBe(userId);
    expect(payload?.email).toBe(email);
  });

  it("should reject expired or invalid tokens", () => {
    const invalidToken = "invalid.token.here";
    const accessPayload = verifyAccessToken(invalidToken);
    const refreshPayload = verifyRefreshToken(invalidToken);

    expect(accessPayload).toBeNull();
    expect(refreshPayload).toBeNull();
  });

  it("should create a user in the database", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const passwordHash = await hashPassword(testPassword);
    testUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(authUsers).values({
      id: testUserId,
      email: testEmail,
      passwordHash,
    });

    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, testEmail))
      .limit(1);

    expect(user).toHaveLength(1);
    expect(user[0].email).toBe(testEmail);
  });

  it("should verify user credentials", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, testEmail))
      .limit(1);

    expect(user).toHaveLength(1);

    const isValid = await comparePassword(testPassword, user[0].passwordHash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword("WrongPassword", user[0].passwordHash);
    expect(isInvalid).toBe(false);
  });

  it("should generate tokens for authenticated user", () => {
    accessToken = generateAccessToken(testUserId, testEmail);
    refreshToken = generateRefreshToken(testUserId, testEmail);

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const accessPayload = verifyAccessToken(accessToken);
    expect(accessPayload?.email).toBe(testEmail);

    const refreshPayload = verifyRefreshToken(refreshToken);
    expect(refreshPayload?.email).toBe(testEmail);
  });

  it("should refresh access token using refresh token", () => {
    const refreshPayload = verifyRefreshToken(refreshToken);
    expect(refreshPayload).toBeTruthy();

    if (refreshPayload) {
      const newAccessToken = generateAccessToken(refreshPayload.userId, refreshPayload.email);
      const newPayload = verifyAccessToken(newAccessToken);

      expect(newPayload?.userId).toBe(refreshPayload.userId);
      expect(newPayload?.email).toBe(refreshPayload.email);
    }
  });

  it("should update last login timestamp", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const beforeUpdate = new Date(Date.now() - 1000);

    await db
      .update(authUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(authUsers.id, testUserId));

    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, testUserId))
      .limit(1);

    expect(user).toHaveLength(1);
    expect(user[0].lastLoginAt).toBeTruthy();
    expect(user[0].lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });
});
