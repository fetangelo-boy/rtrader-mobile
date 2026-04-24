import { describe, it, expect } from "vitest";

const API_BASE = "http://127.0.0.1:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY;

describe("Admin API Key validation", () => {
  it("should have ADMIN_API_KEY set in environment", () => {
    expect(ADMIN_KEY).toBeDefined();
    expect(ADMIN_KEY!.length).toBeGreaterThan(10);
  });

  it("should reject requests without X-Admin-Key header", async () => {
    const resp = await fetch(`${API_BASE}/api/admin/subscriber-status?telegram_id=0`, {
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toBe("Invalid admin key");
  });

  it("should reject requests with wrong X-Admin-Key", async () => {
    const resp = await fetch(`${API_BASE}/api/admin/subscriber-status?telegram_id=0`, {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": "wrong-key-12345",
      },
    });
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toBe("Invalid admin key");
  });

  it("should accept requests with correct X-Admin-Key", async () => {
    const resp = await fetch(`${API_BASE}/api/admin/subscriber-status?telegram_id=999999`, {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_KEY!,
      },
    });
    // 404 = user not found, which means auth passed
    expect(resp.status).toBe(404);
    const body = await resp.json();
    expect(body.error).toBe("User not found");
    expect(body.registered).toBe(false);
  });
});
