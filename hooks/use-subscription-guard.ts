import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type SubscriptionStatus = "loading" | "active" | "expired" | "none";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
  expires_at?: string;
}

/**
 * Hook that checks the current user's subscription status.
 * Returns the status and subscription data for UI decisions.
 */
export function useSubscriptionGuard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Not authenticated');
        }

        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('id, plan, status, current_period_end, expires_at')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code !== 'PGRST116') {
          throw subError;
        }

        if (subData) {
          setSubscription(subData);
        } else {
          setSubscription({
            id: 'default',
            plan: 'free',
            status: 'active',
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[useSubscriptionGuard] Error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

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
