import { describe, it, expect } from "vitest";

describe("Supabase Service Role Key", () => {
  it("should be able to query the database with service role key", async () => {
    const supabaseUrl = "https://vfxezndvkaxlimthkeyx.supabase.co";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(serviceKey, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();

    // Test by querying the chats table (should exist)
    const response = await fetch(`${supabaseUrl}/rest/v1/chats?select=id&limit=1`, {
      headers: {
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    expect(response.status, `Expected 200, got ${response.status}`).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
