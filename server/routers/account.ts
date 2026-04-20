import { router, publicProcedure } from "../_core/trpc";
import { supabase } from "../../lib/supabase";

export const accountRouter = router({
  // Get subscription status for current user
  getSubscription: publicProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.userId;
    if (!userId) throw new Error("Unauthorized");

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("id, plan, status, current_period_end, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return subscription || null;
  }),
});
