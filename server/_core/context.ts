import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getServerSupabase } from "../../lib/supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  supabaseUser: { id: string; email: string } | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  let supabaseUser: { id: string; email: string } | null = null;

  // Try to get Supabase user from Authorization header FIRST
  // (before Manus SDK auth, to avoid JOSEAlgNotAllowed noise for Supabase tokens)
  const authHeader = opts.req.headers.authorization;
  const isSupabaseToken = authHeader?.startsWith("Bearer eyJ");

  if (isSupabaseToken) {
    try {
      const token = authHeader!.slice(7);
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
    // Only try Manus SDK auth for non-Supabase tokens
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
  };
}
