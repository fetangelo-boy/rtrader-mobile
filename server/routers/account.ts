import { router, supabaseProtectedProcedure } from "../_core/trpc";
import { getServerSupabase } from "../../lib/supabase";

export const accountRouter = router({
  // Get subscription status for current user
  getSubscription: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser?.id;
    if (!userId) throw new Error("Unauthorized");
    const supabase = getServerSupabase();

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    // Return default free subscription if none exists
    if (!subscription) {
      return {
        id: "free",
        user_id: userId,
        plan: "free",
        status: "active",
        created_at: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Normalize field names: Supabase uses expires_at, client expects current_period_end
    return {
      ...subscription,
      current_period_end: subscription.expires_at || subscription.current_period_end || null,
      created_at: subscription.started_at || subscription.created_at,
    };
  }),
});
