/**
 * Authentication routes
 * 
 * POST /api/auth/verify-token - Verify one-time authentication token
 */

import { Router, Request, Response } from "express";
import { getServerSupabase } from "@/lib/supabase";

const router = Router();

interface VerifyTokenRequest {
  token: string;
}

interface VerifyTokenResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token?: string;
    user: {
      id: string;
      email: string;
    };
  };
  error?: string;
}

/**
 * POST /api/auth/verify-token
 * 
 * Verify one-time authentication token and return Supabase session
 * 
 * Request body:
 *   - token (string): One-time authentication token from auth_tokens table
 * 
 * Response:
 *   - success (boolean): Whether verification succeeded
 *   - session (object): Supabase session with access_token and user info
 *   - error (string): Error message if verification failed
 */
router.post("/verify-token", async (req: Request, res: Response<VerifyTokenResponse>) => {
  try {
    const { token } = req.body as VerifyTokenRequest;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required",
      });
    }

    const supabase = getServerSupabase();

    // Look up the token in auth_tokens table
    const { data: authTokenData, error: lookupError } = await supabase
      .from("auth_tokens")
      .select("id, user_id, token, expires_at, used")
      .eq("token", token)
      .single();

    if (lookupError || !authTokenData) {
      console.error("[Auth] Token lookup failed:", lookupError);
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    // Check if token has been used
    if (authTokenData.used) {
      console.error("[Auth] Token already used:", token);
      return res.status(401).json({
        success: false,
        error: "Token has already been used",
      });
    }

    // Check if token has expired
    const expiresAt = new Date(authTokenData.expires_at);
    if (expiresAt < new Date()) {
      console.error("[Auth] Token expired:", token);
      return res.status(401).json({
        success: false,
        error: "Token has expired",
      });
    }

    // Get the user
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      authTokenData.user_id
    );

    if (userError || !userData.user) {
      console.error("[Auth] User lookup failed:", userError);
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from("auth_tokens")
      .update({ used: true })
      .eq("id", authTokenData.id);

    if (updateError) {
      console.error("[Auth] Failed to mark token as used:", updateError);
      // Continue anyway, token verification succeeded
    }

    // Create a session for the user
    // We'll return the user info and let the client handle session creation
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession(
      authTokenData.user_id
    );

    if (sessionError || !sessionData.session) {
      console.error("[Auth] Session creation failed:", sessionError);
      return res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }

    console.log(`[Auth] Token verified for user ${authTokenData.user_id}`);

    return res.json({
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user: {
          id: userData.user.id,
          email: userData.user.email || "",
        },
      },
    });
  } catch (error: any) {
    console.error("[Auth] Verify token error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export default router;
