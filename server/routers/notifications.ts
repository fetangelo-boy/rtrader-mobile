import { z } from "zod";
import { supabaseProtectedProcedure, router } from "../_core/trpc";
import { getServerSupabase } from "../../lib/supabase";

export const notificationsRouter = router({
  /**
   * Register a push token for the current user.
   * Called when app starts or when user logs in.
   * Uses Supabase auth (supabaseUser.id = UUID).
   */
  registerToken: supabaseProtectedProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token is required"),
        platform: z.enum(["android", "ios", "web"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.supabaseUser.id;
      const supabase = getServerSupabase();

      // Upsert: insert or update if token already exists
      const { error } = await supabase
        .from("push_tokens")
        .upsert(
          {
            user_id: userId,
            token: input.token,
            platform: input.platform,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        );

      if (error) {
        console.error("[Notifications] Error registering token:", error);
        throw new Error("Failed to register push token");
      }

      return { success: true, message: "Token registered successfully" };
    }),

  /**
   * Deregister a push token (when user logs out or disables notifications).
   */
  unregisterToken: supabaseProtectedProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.supabaseUser.id;
      const supabase = getServerSupabase();

      const { error } = await supabase
        .from("push_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("token", input.token);

      if (error) {
        console.error("[Notifications] Error unregistering token:", error);
        throw new Error("Failed to unregister push token");
      }

      return { success: true, message: "Token unregistered successfully" };
    }),

  /**
   * Get all active tokens for current user.
   */
  getTokens: supabaseProtectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.supabaseUser.id;
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("push_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      console.error("[Notifications] Error getting tokens:", error);
      throw new Error("Failed to get push tokens");
    }

    return data ?? [];
  }),
});
