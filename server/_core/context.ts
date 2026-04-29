import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getServerSupabase } from "../../lib/supabase";
import { verifyAccessToken } from "./jwt";
import { getDb } from "../db";
import { authUsers } from "../../drizzle/schema_auth";
import { eq } from "drizzle-orm";

export type JwtUser = {
  id: string;
  email: string;
  userId: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  supabaseUser: { id: string; email: string } | null;
  jwtUser: JwtUser | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  let supabaseUser: { id: string; email: string } | null = null;
  let jwtUser: JwtUser | null = null;

  const authHeader = opts.req.headers.authorization;

  // Try JWT auth first (new MySQL/JWT system)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    
    // Try to verify as JWT token
    const jwtPayload = verifyAccessToken(token);
    if (jwtPayload) {
      jwtUser = {
        id: jwtPayload.userId,
        email: jwtPayload.email,
        userId: jwtPayload.userId,
      };
      console.log("[Auth] JWT user authenticated:", jwtUser.email);
      
      return {
        req: opts.req,
        res: opts.res,
        user,
        supabaseUser,
        jwtUser,
      };
    }

    // Fall back to Supabase token verification if JWT fails
    try {
      const supabase = getServerSupabase();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        supabaseUser = {
          id: data.user.id,
          email: data.user.email || "",
        };
        console.log("[Auth] Supabase user authenticated:", supabaseUser.email);
      } else if (error) {
        console.warn("[Auth] Supabase token verification failed:", error.message);
      }
    } catch (error) {
      console.warn("[Auth] Supabase auth error:", String(error));
      supabaseUser = null;
    }
  } else {
    // Only try Manus SDK auth for non-Bearer tokens
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    supabaseUser,
    jwtUser,
  };
}
