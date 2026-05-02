import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { requireSubscription, getSubscriptionStatus, isExpiringsoon } from "../middleware/subscription-guard";

/**
 * Router for endpoints that require active subscription
 * All procedures in this router will verify user has active subscription before executing
 */
export const protectedSubscriptionRouter = router({
  /**
   * Get current subscription status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await getSubscriptionStatus(String(ctx.user.id));
    return status;
  }),

  /**
   * Check if subscription is expiring soon
   */
  isExpiringSoon: protectedProcedure
    .input(
      z.object({
        daysThreshold: z.number().int().positive().default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      const expiring = await isExpiringsoon(String(ctx.user.id), input.daysThreshold);
      return { expiring };
    }),

  /**
   * Verify subscription and get details
   * Throws error if no active subscription
   */
  verify: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await requireSubscription(String(ctx.user.id));
    return {
      verified: true,
      subscription,
      message: "Active subscription verified",
    };
  }),

  /**
   * Protected endpoint example - Get premium features
   * This endpoint requires active subscription
   */
  getPremiumFeatures: protectedProcedure.query(async ({ ctx }) => {
    // Verify subscription first
    const subscription = await requireSubscription(String(ctx.user.id));

    // Return premium features available to user
    return {
      features: [
        "advanced_analytics",
        "custom_alerts",
        "priority_support",
        "export_data",
        "api_access",
      ],
      subscription: {
        id: subscription.id,
        expiresAt: subscription.endDate,
        status: subscription.status,
      },
    };
  }),

  /**
   * Protected endpoint example - Get trading signals
   * This endpoint requires active subscription
   */
  getTradingSignals: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().positive().default(10),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify subscription first
      await requireSubscription(String(ctx.user.id));

      // TODO: Implement actual trading signals logic
      // This is a placeholder that returns mock data
      return {
        signals: [
          {
            id: "signal_1",
            symbol: "AAPL",
            type: "BUY",
            price: 150.25,
            timestamp: new Date(),
            confidence: 0.85,
          },
          {
            id: "signal_2",
            symbol: "GOOGL",
            type: "SELL",
            price: 140.5,
            timestamp: new Date(),
            confidence: 0.72,
          },
        ],
        total: 2,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Protected endpoint example - Get portfolio analysis
   * This endpoint requires active subscription
   */
  getPortfolioAnalysis: protectedProcedure.query(async ({ ctx }) => {
    // Verify subscription first
    await requireSubscription(String(ctx.user.id));

    // TODO: Implement actual portfolio analysis logic
    // This is a placeholder that returns mock data
    return {
      portfolio: {
        totalValue: 50000,
        dayChange: 1250,
        dayChangePercent: 2.5,
        holdings: [
          {
            symbol: "AAPL",
            shares: 100,
            value: 15025,
            dayChange: 250,
          },
          {
            symbol: "GOOGL",
            shares: 50,
            value: 7025,
            dayChange: 150,
          },
        ],
      },
      analysis: {
        diversification: "Good",
        riskLevel: "Medium",
        recommendation: "Increase tech sector exposure",
      },
    };
  }),

  /**
   * Protected endpoint example - Get market data
   * This endpoint requires active subscription
   */
  getMarketData: protectedProcedure
    .input(
      z.object({
        symbols: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify subscription first
      await requireSubscription(String(ctx.user.id));

      // TODO: Implement actual market data logic
      // This is a placeholder that returns mock data
      return {
        data: input.symbols.map((symbol) => ({
          symbol,
          price: Math.random() * 200,
          change: Math.random() * 10 - 5,
          changePercent: Math.random() * 5 - 2.5,
          timestamp: new Date(),
        })),
      };
    }),
});
