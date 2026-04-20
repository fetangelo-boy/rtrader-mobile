import { describe, it, expect, beforeAll } from "vitest";
import { getSupabaseClient } from "@/lib/supabase-client";

describe("E2E Auth Tests", () => {
  const supabase = getSupabaseClient();
  const TEST_EMAIL = "test@rtrader.com";
  const TEST_PASSWORD = "TestPassword123!";

  it("should sign in with valid credentials", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    expect(data.user?.email).toBe(TEST_EMAIL);
    expect(data.user?.id).toBeDefined();

    console.log("✅ Sign in successful");
    console.log(`   User ID: ${data.user?.id}`);
    console.log(`   Email: ${data.user?.email}`);
  });

  it("should get current session after sign in", async () => {
    // First sign in
    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    // Then get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    expect(session).toBeDefined();
    expect(session?.user?.email).toBe(TEST_EMAIL);

    console.log("✅ Session retrieved successfully");
  });

  it("should fail to sign in with invalid password", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: "WrongPassword123!",
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain("Invalid login credentials");

    console.log("✅ Invalid password correctly rejected");
  });

  it("should sign out successfully", async () => {
    // First sign in
    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    // Then sign out
    const { error } = await supabase.auth.signOut();

    expect(error).toBeNull();

    // Verify session is cleared
    const {
      data: { session },
    } = await supabase.auth.getSession();

    expect(session).toBeNull();

    console.log("✅ Sign out successful");
  });
});
