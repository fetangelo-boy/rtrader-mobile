import { describe, it, expect } from "vitest";

describe("New Bot Token Validation (@rtrader_mobapp_bot)", () => {
  it("should be a valid Telegram bot token", async () => {
    const token = process.env.BOT_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(30);

    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result.username).toBe("rtrader_mobapp_bot");
    console.log(`✅ Bot: @${data.result.username} (${data.result.first_name})`);
  });
});
