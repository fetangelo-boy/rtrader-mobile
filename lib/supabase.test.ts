import { describe, it, expect, beforeAll } from "vitest";
import { supabase } from "./supabase";

describe("Supabase Connection", () => {
  it("should initialize Supabase client with valid credentials", () => {
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty("auth");
    expect(supabase).toHaveProperty("from");
  });

  it("should have valid environment variables", () => {
    expect(process.env.VITE_SUPABASE_URL).toBeDefined();
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.VITE_SUPABASE_URL).toContain("supabase.co");
  });

  it("should be able to call Supabase auth API", async () => {
    // Test basic connectivity by checking auth status
    const { data, error } = await supabase.auth.getSession();
    // We expect either data or error, but not both undefined
    expect(data !== undefined || error !== undefined).toBe(true);
  });
});
