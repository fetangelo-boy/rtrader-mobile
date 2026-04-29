import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { authUsers } from '../../drizzle/schema_auth';
import { eq } from 'drizzle-orm';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
} from '../_core/jwt';

export const authRouter = router({
  /**
   * Register a new user with email and password
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Check if user already exists
      const existing = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.email, email))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user (use a UUID-like ID for now, or let DB auto-increment)
      const result = await db.insert(authUsers).values({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        passwordHash,
      });

      // Get the created user
      const user = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.email, email))
        .limit(1);

      if (!user[0]) {
        throw new Error('Failed to create user');
      }

      const accessToken = generateAccessToken(user[0].id, email);
      const refreshToken = generateRefreshToken(user[0].id, email);

      return {
        success: true,
        user: {
          id: user[0].id,
          email: user[0].email,
        },
        accessToken,
        refreshToken,
      };
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Find user by email
      const users = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.email, email))
        .limit(1);

      if (users.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = users[0];

      // Verify password
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await db
        .update(authUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(authUsers.id, user.id));

      const accessToken = generateAccessToken(user.id, email);
      const refreshToken = generateRefreshToken(user.id, email);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
      };
    }),

  /**
   * Refresh access token using refresh token
   */
  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { refreshToken } = input;

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new access token
      const accessToken = generateAccessToken(payload.userId, payload.email);

      return {
        success: true,
        accessToken,
      };
    }),

  /**
   * Get current user (protected)
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('Not authenticated');
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
    };
  }),

  /**
   * Logout (just invalidate token on client)
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Token invalidation happens on client side (remove from storage)
    // Optionally, you could add token to a blacklist here
    return { success: true };
  }),
});
