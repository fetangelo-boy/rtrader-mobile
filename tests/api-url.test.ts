import { describe, it, expect } from "vitest";

describe("API Base URL Configuration", () => {
  it("should have EXPO_PUBLIC_API_BASE_URL environment variable set", () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    console.log("EXPO_PUBLIC_API_BASE_URL:", apiUrl);
    
    expect(apiUrl).toBeTruthy();
    expect(apiUrl).toContain("railway.app");
  });

  it("should be a valid HTTPS URL", () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(apiUrl).toMatch(/^https:\/\//);
  });

  it("should not have trailing slash", () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(apiUrl).not.toMatch(/\/$/);
  });

  it("should construct valid tRPC endpoint URL", () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const trpcUrl = `${apiUrl}/api/trpc`;
    expect(trpcUrl).toMatch(/^https:\/\/.*\/api\/trpc$/);
  });
});
