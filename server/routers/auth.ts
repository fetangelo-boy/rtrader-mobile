import { z } from 'zod';
import { router, publicProcedure, supabaseProtectedProcedure } from '../_core/trpc';
import { getServerSupabase } from '../../lib/supabase';

/**
 * Auth router — fully migrated to Supabase Auth.
 * No MySQL dependency. All user management goes through Supabase Auth API.
 *
 * NOTE: The mobile app authenticates directly via supabase.auth.signInWithPassword()
 * on the client side. These tRPC endpoints are for server-side operations only
 * (e.g., admin creating users, password reset).
 */
export const authRouter = router({
  /**
   * Register a new user — creates in Supabase Auth
   * Used by admin when creating subscribers via /approve command
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
      const supabase = getServerSupabase();

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Failed to create user');

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      };
    }),

  /**
   * Get current user info (server-side)
   * Client should use supabase.auth.getUser() directly instead
   */
  me: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const user = ctx.supabaseUser;
    if (!user) throw new Error('Not authenticated');

    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email?.split('@')[0] || 'Пользователь',
    };
  }),

  /**
   * Logout — client-side only (remove session from SecureStore)
   * Server has no session state to clear with Supabase JWT
   */
  logout: supabaseProtectedProcedure.mutation(async () => {
    return { success: true };
  }),
});
