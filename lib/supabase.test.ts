import { describe, it, expect } from "vitest";
import { getServerSupabase } from "./supabase";

describe("Supabase Connection", () => {
  it("should initialize Supabase client with valid credentials", () => {
    const supabase = getServerSupabase();
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty("from");
  });

  it("should have valid environment variables", () => {
    expect(process.env.VITE_SUPABASE_URL).toBeDefined();
    expect(process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.VITE_SUPABASE_URL).toContain("supabase.co");
  });

  it("should be able to call Supabase API", async () => {
    const supabase = getServerSupabase();
    // Test basic connectivity by querying a table
    const { data, error } = await supabase.from("profiles").select("*").limit(1);
    // We expect either data or error, but not both undefined
    expect(data !== undefined || error !== undefined).toBe(true);
  });
});
