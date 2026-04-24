import { z } from "zod";
import { router, supabaseProtectedProcedure } from "../_core/trpc";
import { getServerSupabase } from "../../lib/supabase";
import { storagePut } from "../storage";

export const profileRouter = router({
  /**
   * Get the current user's profile (from Supabase auth + profiles table)
   */
  getProfile: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser.id;
    const supabase = getServerSupabase();

    // Get auth user data (email is in auth.users)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError) {
      console.warn("[Profile] Could not get auth user:", authError.message);
    }

    // Get profile row
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.warn("[Profile] Could not get profile:", profileError.message);
    }

    return {
      id: userId,
      email: ctx.supabaseUser.email || authUser?.user?.email || "",
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  }),

  /**
   * Update the current user's profile (username only; email change is separate)
   */
  updateProfile: supabaseProtectedProcedure
    .input(
      z.object({
        username: z.string().min(1).max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }: any) => {
      const userId = ctx.supabaseUser.id;
      const supabase = getServerSupabase();

      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: input.username ?? null,
          },
          { onConflict: "id" },
        );

      if (error) throw new Error(error.message);

      return { success: true };
    }),

  /**
   * Upload avatar: receives base64-encoded image, stores in S3, saves URL to profiles table
   */
  uploadAvatar: supabaseProtectedProcedure
    .input(
      z.object({
        base64: z.string(), // base64-encoded image data (no data URI prefix)
        mimeType: z.string().default("image/jpeg"),
      }),
    )
    .mutation(async ({ ctx, input }: any) => {
      const userId = ctx.supabaseUser.id;
      const supabase = getServerSupabase();

      // Decode base64 to buffer
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const key = `avatars/${userId}.${ext}`;

      // Upload to S3
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Save URL to profiles table
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, avatar_url: url },
          { onConflict: "id" },
        );

      if (error) throw new Error(error.message);

      return { avatar_url: url };
    }),
});
