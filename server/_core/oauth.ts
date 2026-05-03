import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the frontend URL (Expo web on port 8081)
      // Cookie is set with parent domain so it works across both 3000 and 8081 subdomains
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Email/password login for mobile app
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ error: "email and password are required" });
        return;
      }

      console.log(`[Auth] Login attempt for email: ${email}`);
      
      // Import Supabase client
      const { getServerSupabase } = await import("../../lib/supabase.js");
      const supabase = getServerSupabase();
      
      // Use Supabase to authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        console.error(`[Auth] Login failed for ${email}:`, error?.message);
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      console.log(`[Auth] Login successful for ${email}, user_id: ${data.user.id}`);
      
      // Ensure profile exists and has username
      const username = data.user.user_metadata?.name || email.split('@')[0];
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: email,
          username: username,
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) {
        console.error(`[Auth] Failed to update profile for ${email}:`, profileError);
        // Don't fail login if profile update fails, just log it
      } else {
        console.log(`[Auth] Profile updated for ${email} with username: ${username}`);
      }
      
      // For mobile, we'll return the Supabase session directly
      // The mobile app can use this access_token with the API

      res.json({
        success: true,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: username,
        },
      });
    } catch (error) {
      console.error("[Auth] Login endpoint error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  /**
   * POST /api/auth/generate-telegram-token
   *
   * Generates a one-time login token for a Supabase user (called internally by the bot after /approve).
   * Requires X-Admin-Key header.
   *
   * Body: { supabase_user_id: string, telegram_id?: string }
   * Response: { token: string, expires_at: string }
   */
  app.post("/api/auth/generate-telegram-token", async (req: Request, res: Response) => {
    try {
      const adminKey = process.env.ADMIN_API_KEY;
      const providedKey = req.headers["x-admin-key"] as string;
      if (!adminKey || providedKey !== adminKey) {
        res.status(401).json({ error: "Invalid admin key" });
        return;
      }

      const { supabase_user_id, telegram_id } = req.body;
      if (!supabase_user_id) {
        res.status(400).json({ error: "supabase_user_id is required" });
        return;
      }

      const { getDb } = await import("../db.js");
      const { oneTimeLoginTokens } = await import("../../drizzle/schema.js");
      const crypto = await import("crypto");

      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }

      // Ensure table exists (create if not)
      try {
        await db.execute(
          `CREATE TABLE IF NOT EXISTS one_time_login_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(128) NOT NULL UNIQUE,
            supabaseUserId VARCHAR(64) NOT NULL,
            telegramId VARCHAR(64),
            expiresAt TIMESTAMP NOT NULL,
            usedAt TIMESTAMP NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )` as any
        );
      } catch (createErr: any) {
        // Table might already exist, ignore
        if (!createErr.message?.includes("already exists")) {
          console.error("[Auth] Failed to create one_time_login_tokens table:", createErr.message);
        }
      }

      // Generate secure random token
      const token = crypto.default.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.insert(oneTimeLoginTokens).values({
        token,
        supabaseUserId: supabase_user_id,
        telegramId: telegram_id ? String(telegram_id) : null,
        expiresAt,
      });

      console.log(`[Auth] Generated one-time token for user ${supabase_user_id} (tg: ${telegram_id})`);

      res.json({
        token,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error: any) {
      console.error("[Auth] generate-telegram-token error:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  /**
   * POST /api/auth/exchange-telegram-token
   *
   * Exchanges a one-time Telegram login token for a Supabase session.
   * Called by the mobile app when opened via deep link after /approve.
   *
   * Body: { token: string }
   * Response: { success, access_token, refresh_token, user }
   */
  app.post("/api/auth/exchange-telegram-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== "string") {
        res.status(400).json({ error: "token is required" });
        return;
      }

      const { getDb } = await import("../db.js");
      const { oneTimeLoginTokens } = await import("../../drizzle/schema.js");
      const { eq, and, isNull, gt } = await import("drizzle-orm");
      const { getServerSupabase } = await import("../../lib/supabase.js");

      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }

      // Find the token
      const now = new Date();
      const [tokenRecord] = await db
        .select()
        .from(oneTimeLoginTokens)
        .where(
          and(
            eq(oneTimeLoginTokens.token, token),
            isNull(oneTimeLoginTokens.usedAt),
            gt(oneTimeLoginTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (!tokenRecord) {
        console.warn(`[Auth] exchange-telegram-token: invalid/expired/used token: ${token.slice(0, 16)}...`);
        res.status(401).json({ error: "Token is invalid, expired, or already used" });
        return;
      }

      // Mark token as used immediately (one-time use)
      await db
        .update(oneTimeLoginTokens)
        .set({ usedAt: now })
        .where(eq(oneTimeLoginTokens.token, token));

      // Get user from Supabase by ID
      const supabase = getServerSupabase();
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        tokenRecord.supabaseUserId
      );

      if (userError || !userData.user) {
        console.error(`[Auth] exchange-telegram-token: user not found in Supabase: ${tokenRecord.supabaseUserId}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Create a new Supabase session for this user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
        user_id: tokenRecord.supabaseUserId,
      });

      if (sessionError || !sessionData.session) {
        console.error(`[Auth] exchange-telegram-token: failed to create session:`, sessionError?.message);
        res.status(500).json({ error: "Failed to create session" });
        return;
      }

      const user = userData.user;
      const username = user.user_metadata?.name || user.email?.split("@")[0] || "User";

      console.log(`[Auth] exchange-telegram-token: success for user ${user.email} (tg: ${tokenRecord.telegramId})`);

      res.json({
        success: true,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: username,
        },
      });
    } catch (error: any) {
      console.error("[Auth] exchange-telegram-token error:", error);
      res.status(500).json({ error: "Token exchange failed" });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
