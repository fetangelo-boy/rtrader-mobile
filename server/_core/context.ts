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

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Try to get Supabase user from Authorization header
  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const supabase = getServerSupabase();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        supabaseUser = {
          id: data.user.id,
          email: data.user.email || "",
        };
      }
    }
  } catch (error) {
    // Supabase auth is optional
    supabaseUser = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    supabaseUser,
  };
}
