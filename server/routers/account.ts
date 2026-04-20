import { router, protectedProcedure } from "../_core/trpc";
import { supabase } from "../../lib/supabase";

export const accountRouter = router({
  // Get subscription status for current user
  getSubscription: protectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser?.id;
    if (!userId) throw new Error("Unauthorized");

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

    return subscription;
  }),
});
