import { trpc } from "@/lib/trpc";

export type SubscriptionStatus = "loading" | "active" | "expired" | "none";

/**
 * Hook that checks the current user's subscription status.
 * Returns the status and subscription data for UI decisions.
 */
export function useSubscriptionGuard() {
  const { data: subscription, isLoading, error } = trpc.account.getSubscription.useQuery(
    undefined,
    {
      retry: 1,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  if (isLoading) {
    return { status: "loading" as SubscriptionStatus, subscription: null };
  }

  if (error || !subscription) {
    return { status: "none" as SubscriptionStatus, subscription: null };
  }

  // Check if subscription is expired
  const expiresAt = subscription.expires_at || subscription.current_period_end;
  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (expiryDate < new Date()) {
      return { status: "expired" as SubscriptionStatus, subscription };
    }
  }

  // Check status field
  if (subscription.status === "canceled" || subscription.status === "expired") {
    return { status: "expired" as SubscriptionStatus, subscription };
  }

  // Free plan is always active (no expiry)
  if (subscription.plan === "free") {
    return { status: "active" as SubscriptionStatus, subscription };
  }

  return { status: "active" as SubscriptionStatus, subscription };
}
