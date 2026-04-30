import { useQuery } from "@tanstack/react-query";
import { accountApi } from "@/lib/api-rest";

export type SubscriptionStatus = "loading" | "active" | "expired" | "none";

/**
 * Hook that checks the current user's subscription status.
 * Returns the status and subscription data for UI decisions.
 *
 * Backend currently has no /api/account/subscription endpoint, so
 * accountApi.getSubscription returns a synthetic active "free" plan
 * until the real endpoint ships. This keeps the app functional
 * against the Beget contour.
 */
export function useSubscriptionGuard() {
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["account", "subscription"],
    queryFn: () => accountApi.getSubscription(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

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

  if (subscription.status === "canceled" || subscription.status === "expired") {
    return { status: "expired" as SubscriptionStatus, subscription };
  }

  if (subscription.plan === "free") {
    return { status: "active" as SubscriptionStatus, subscription };
  }

  return { status: "active" as SubscriptionStatus, subscription };
}
