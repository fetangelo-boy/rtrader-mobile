import { router, publicProcedure, supabaseProtectedProcedure } from "../_core/trpc";
import { getServerSupabase } from "../../lib/supabase";
import { z } from "zod";

/**
 * Subscriptions router — fully migrated to Supabase PostgreSQL.
 * No MySQL dependency.
 */

// Static subscription plans (no DB table needed — these are fixed)
const SUBSCRIPTION_PLANS = [
  { id: "weekly", name: "Неделя", duration_days: 7, price: 990, currency: "RUB" },
  { id: "monthly", name: "Месяц", duration_days: 30, price: 2990, currency: "RUB" },
  { id: "quarterly", name: "Квартал", duration_days: 90, price: 7990, currency: "RUB" },
  { id: "premium", name: "Премиум (30 дней)", duration_days: 30, price: 2990, currency: "RUB" },
];

// Static payment details (configured by admin)
const PAYMENT_DETAILS = {
  bank: "Т-Банк",
  cardNumber: process.env.PAYMENT_CARD_NUMBER || "2200 **** **** ****",
  cardExpiry: process.env.PAYMENT_CARD_EXPIRY || "**/**",
  recipientName: process.env.PAYMENT_RECIPIENT_NAME || "Администратор RTrader",
};

export const subscriptionsRouter = router({
  /**
   * Get all available subscription plans
   */
  getPlans: publicProcedure.query(async () => {
    return SUBSCRIPTION_PLANS;
  }),

  /**
   * Get current payment details (T-Bank)
   */
  getPaymentDetails: publicProcedure.query(async () => {
    return PAYMENT_DETAILS;
  }),

  /**
   * Get current user's subscription status
   */
  getStatus: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser?.id as string;
    if (!userId) throw new Error("Unauthorized");

    const supabase = getServerSupabase();

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to get subscription: ${error.message}`);

    if (!subscription) {
      return {
        hasSubscription: false,
        status: "none",
        plan: null,
        expiresAt: null,
        isExpired: true,
      };
    }

    const isExpired = subscription.expires_at
      ? new Date(subscription.expires_at) < new Date()
      : false;

    return {
      hasSubscription: true,
      status: isExpired ? "expired" : subscription.status,
      plan: subscription.plan,
      expiresAt: subscription.expires_at,
      startedAt: subscription.started_at,
      isExpired,
    };
  }),

  /**
   * Create a subscription request (user applies for subscription)
   * Stores request in Supabase for admin review
   */
  createRequest: supabaseProtectedProcedure
    .input(
      z.object({
        planId: z.string(),
        telegramId: z.string().optional(),
        firstName: z.string().optional(),
        receiptUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const userId = ctx.supabaseUser?.id as string;
      if (!userId) throw new Error("Unauthorized");

      const supabase = getServerSupabase();

      // Validate plan
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === input.planId);
      if (!plan) throw new Error("Plan not found");

      // Store request in subscriptions table with status "pending"
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: input.planId,
            status: "trialing", // pending approval
            started_at: new Date().toISOString(),
            expires_at: null, // set by admin on approval
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw new Error(`Failed to create request: ${error.message}`);

      return {
        id: data.id,
        status: "pending",
        message: "Заявка создана. Отправьте чек администратору и ожидайте подтверждения.",
      };
    }),

  /**
   * Get user's subscription history
   */
  getHistory: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser?.id as string;
    if (!userId) throw new Error("Unauthorized");

    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to get history: ${error.message}`);

    return (data || []).map((sub: any) => ({
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      createdAt: sub.created_at,
    }));
  }),
});
