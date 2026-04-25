import { Request, Response, Express } from "express";
import { getServerSupabase } from "../../lib/supabase";
import crypto from "crypto";

/**
 * Admin API endpoints for Telegram bot integration.
 * All endpoints require X-Admin-Key header matching ADMIN_API_KEY env var.
 *
 * Endpoints:
 * - POST /api/admin/create-subscriber  — Create new subscriber after payment
 * - POST /api/admin/renew-subscription — Extend subscription expiry
 * - POST /api/admin/reset-password     — Reset subscriber password
 * - POST /api/admin/block-subscriber   — Block/unblock subscriber
 * - GET  /api/admin/subscriber-status  — Check subscriber status by telegram_id or email
 */

function verifyAdminKey(req: Request, res: Response): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.error("[Admin] ADMIN_API_KEY not configured");
    res.status(500).json({ error: "Admin API not configured" });
    return false;
  }
  const providedKey = req.headers["x-admin-key"] as string;
  if (!providedKey || providedKey !== adminKey) {
    console.warn("[Admin] Unauthorized access attempt");
    res.status(401).json({ error: "Invalid admin key" });
    return false;
  }
  return true;
}

function generatePassword(length: number = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function generateSubscriptionId(): string {
  return "sub-" + crypto.randomUUID().split("-")[0];
}

export function registerAdminRoutes(app: Express) {
  /**
   * POST /api/admin/create-subscriber
   *
   * Creates a new user account + profile + subscription after Telegram bot confirms payment.
   *
   * Body:
   * {
   *   "telegram_id": "123456789",       // Required: Telegram user ID
   *   "telegram_name": "Иван Петров",   // Required: Display name from Telegram
   *   "email": "ivan@example.com",      // Optional: if not provided, generates telegram_id@rtrader.app
   *   "plan": "premium",                // Optional: subscription plan (default: "premium")
   *   "days": 30                        // Optional: subscription duration in days (default: 30)
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "user_id": "uuid",
   *   "email": "ivan@example.com",
   *   "password": "Xk9mP2qR",
   *   "subscription": { ... }
   * }
   */
  app.post("/api/admin/create-subscriber", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;

    try {
      const { telegram_id, telegram_name, email: providedEmail, plan = "premium", days = 30 } = req.body;

      if (!telegram_id || !telegram_name) {
        res.status(400).json({ error: "telegram_id and telegram_name are required" });
        return;
      }

      const supabase = getServerSupabase();

      // Check if user with this telegram_id already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: any) => u.user_metadata?.telegram_id === String(telegram_id)
      );

      if (existingUser) {
        res.status(409).json({
          error: "User with this telegram_id already exists",
          user_id: existingUser.id,
          email: existingUser.email,
        });
        return;
      }

      // Generate email if not provided
      const email = providedEmail || `tg${telegram_id}@rtrader.app`;

      // Check if email is already taken
      const existingByEmail = existingUsers?.users?.find((u: any) => u.email === email);
      if (existingByEmail) {
        res.status(409).json({
          error: "User with this email already exists",
          user_id: existingByEmail.id,
          email: existingByEmail.email,
        });
        return;
      }

      // Generate password
      const password = generatePassword(10);

      // 1. Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: String(telegram_id),
          name: telegram_name,
          email_verified: true,
        },
      });

      if (authError || !authData.user) {
        console.error("[Admin] Failed to create user:", authError?.message);
        res.status(500).json({ error: "Failed to create user: " + (authError?.message || "unknown") });
        return;
      }

      const userId = authData.user.id;
      console.log(`[Admin] Created user ${email} (${userId}) for telegram_id ${telegram_id}`);

      // 2. Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        username: telegram_name,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${telegram_name}`,
      });

      if (profileError) {
        console.error("[Admin] Failed to create profile:", profileError.message);
        // Don't fail — user is created, profile can be fixed later
      }

      // 3. Create subscription
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const subscriptionId = generateSubscriptionId();

      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          id: subscriptionId,
          user_id: userId,
          plan,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (subError) {
        console.error("[Admin] Failed to create subscription:", subError.message);
        // User exists but subscription failed — return partial success
        res.status(207).json({
          success: false,
          warning: "User created but subscription failed: " + subError.message,
          user_id: userId,
          email,
          password,
        });
        return;
      }

      console.log(`[Admin] Subscription ${subscriptionId} created for ${email}, expires: ${expiresAt.toISOString()}`);

      res.json({
        success: true,
        user_id: userId,
        email,
        password,
        telegram_id: String(telegram_id),
        subscription: {
          id: subscriptionId,
          plan,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[Admin] create-subscriber error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/admin/renew-subscription
   *
   * Extend or renew an existing subscription.
   *
   * Body:
   * {
   *   "telegram_id": "123456789",  // Required: find user by telegram_id
   *   "days": 30,                  // Optional: days to add (default: 30)
   *   "plan": "premium"            // Optional: change plan
   * }
   */
  app.post("/api/admin/renew-subscription", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;

    try {
      const { telegram_id, email, days = 30, plan, approved_until } = req.body;

      if (!telegram_id && !email) {
        res.status(400).json({ error: "telegram_id is required" });
        return;
      }

      const supabase = getServerSupabase();

      // Find user by telegram_id or email
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const user = usersData?.users?.find(
        (u: any) =>
          (telegram_id && u.user_metadata?.telegram_id === String(telegram_id)) ||
          (email && u.email === email)
      );

      if (!user) {
        res.status(404).json({ error: "User not found with this telegram_id or email" });
        return;
      }

      // Get current subscription
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      let newExpiry: Date;

      if (approved_until) {
        // Parse exact date in DD.MM.YYYY or ISO format
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(approved_until)) {
          const [dd, mm, yyyy] = approved_until.split(".");
          newExpiry = new Date(`${yyyy}-${mm}-${dd}T23:59:59.000Z`);
        } else {
          newExpiry = new Date(approved_until);
        }
        if (isNaN(newExpiry.getTime())) {
          res.status(400).json({ error: "Invalid approved_until date format. Use DD.MM.YYYY or ISO string." });
          return;
        }
      } else if (currentSub && currentSub.status === "active" && new Date(currentSub.expires_at) > now) {
        // Extend from current expiry
        newExpiry = new Date(new Date(currentSub.expires_at).getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        // Start fresh from now
        newExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }

      if (currentSub) {
        // Update existing subscription
        const updateData: any = {
          status: "active",
          expires_at: newExpiry.toISOString(),
          updated_at: now.toISOString(),
        };
        if (plan) updateData.plan = plan;

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("id", currentSub.id);

        if (updateError) {
          res.status(500).json({ error: "Failed to update subscription: " + updateError.message });
          return;
        }

        console.log(`[Admin] Subscription renewed for ${user.email}, new expiry: ${newExpiry.toISOString()}`);
        res.json({
          success: true,
          user_id: user.id,
          email: user.email,
          subscription: {
            id: currentSub.id,
            plan: plan || currentSub.plan,
            status: "active",
            expires_at: newExpiry.toISOString(),
          },
        });
      } else {
        // Create new subscription
        const subscriptionId = generateSubscriptionId();
        const { error: insertError } = await supabase.from("subscriptions").insert({
          id: subscriptionId,
          user_id: user.id,
          plan: plan || "premium",
          status: "active",
          started_at: now.toISOString(),
          expires_at: newExpiry.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });

        if (insertError) {
          res.status(500).json({ error: "Failed to create subscription: " + insertError.message });
          return;
        }

        console.log(`[Admin] New subscription created for ${user.email}, expires: ${newExpiry.toISOString()}`);
        res.json({
          success: true,
          user_id: user.id,
          email: user.email,
          subscription: {
            id: subscriptionId,
            plan: plan || "premium",
            status: "active",
            expires_at: newExpiry.toISOString(),
          },
        });
      }
    } catch (error: any) {
      console.error("[Admin] renew-subscription error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/admin/reset-password
   *
   * Reset a subscriber's password and return the new one.
   *
   * Body:
   * {
   *   "telegram_id": "123456789"  // Required
   * }
   */
  app.post("/api/admin/reset-password", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;

    try {
      const { telegram_id, email, new_password } = req.body;

      if (!telegram_id && !email) {
        res.status(400).json({ error: "telegram_id or email is required" });
        return;
      }

      const supabase = getServerSupabase();

      // Find user by telegram_id or email
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const user = usersData?.users?.find(
        (u: any) =>
          (telegram_id && u.user_metadata?.telegram_id === String(telegram_id)) ||
          (email && u.email === email)
      );

      if (!user) {
        res.status(404).json({ error: "User not found with this telegram_id or email" });
        return;
      }

      // Use provided password or generate a new one
      const newPassword = new_password || generatePassword(10);

      // Update password
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (error) {
        res.status(500).json({ error: "Failed to reset password: " + error.message });
        return;
      }

      console.log(`[Admin] Password reset for ${user.email} (telegram_id: ${telegram_id})`);
      res.json({
        success: true,
        user_id: user.id,
        email: user.email,
        password: newPassword,
      });
    } catch (error: any) {
      console.error("[Admin] reset-password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/admin/block-subscriber
   *
   * Block or unblock a subscriber.
   *
   * Body:
   * {
   *   "telegram_id": "123456789",  // Required
   *   "blocked": true               // Required: true to block, false to unblock
   * }
   */
  app.post("/api/admin/block-subscriber", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;

    try {
      const { telegram_id, blocked } = req.body;

      if (!telegram_id || typeof blocked !== "boolean") {
        res.status(400).json({ error: "telegram_id and blocked (boolean) are required" });
        return;
      }

      const supabase = getServerSupabase();

      // Find user by telegram_id
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const user = usersData?.users?.find(
        (u: any) => u.user_metadata?.telegram_id === String(telegram_id)
      );

      if (!user) {
        res.status(404).json({ error: "User not found with this telegram_id" });
        return;
      }

      if (blocked) {
        // Block: set subscription status to cancelled and ban user
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        await supabase.auth.admin.updateUserById(user.id, {
          ban_duration: "876000h", // ~100 years
        });
      } else {
        // Unblock: remove ban
        await supabase.auth.admin.updateUserById(user.id, {
          ban_duration: "none",
        });
      }

      console.log(`[Admin] User ${user.email} ${blocked ? "blocked" : "unblocked"}`);
      res.json({
        success: true,
        user_id: user.id,
        email: user.email,
        blocked,
      });
    } catch (error: any) {
      console.error("[Admin] block-subscriber error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/admin/subscriber-status?telegram_id=123456789
   * GET /api/admin/subscriber-status?email=ivan@example.com
   *
   * Check subscriber status.
   */
  app.get("/api/admin/subscriber-status", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;

    try {
      const { telegram_id, email } = req.query;

      if (!telegram_id && !email) {
        res.status(400).json({ error: "telegram_id or email is required" });
        return;
      }

      const supabase = getServerSupabase();

      // Find user
      const { data: usersData } = await supabase.auth.admin.listUsers();
      let user: any;

      if (telegram_id) {
        user = usersData?.users?.find(
          (u: any) => u.user_metadata?.telegram_id === String(telegram_id)
        );
      } else if (email) {
        user = usersData?.users?.find((u: any) => u.email === email);
      }

      if (!user) {
        res.status(404).json({ error: "User not found", registered: false });
        return;
      }

      // Get subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const isExpired = subscription
        ? new Date(subscription.expires_at) < new Date()
        : true;

      res.json({
        registered: true,
        user_id: user.id,
        email: user.email,
        telegram_id: user.user_metadata?.telegram_id || null,
        username: profile?.username || user.user_metadata?.name || null,
        banned: !!user.banned_until,
        subscription: subscription
          ? {
              id: subscription.id,
              plan: subscription.plan,
              status: isExpired ? "expired" : subscription.status,
              started_at: subscription.started_at,
              expires_at: subscription.expires_at,
              is_expired: isExpired,
            }
          : null,
      });
    } catch (error: any) {
      console.error("[Admin] subscriber-status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  console.log("[Admin] Admin API routes registered");
}
