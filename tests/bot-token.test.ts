import { describe, it, expect } from "vitest";

describe("Bot Token Validation", () => {
  it("should validate BOT_TOKEN via Telegram getMe API", async () => {
    const token = process.env.BOT_TOKEN;
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(10);

    const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await resp.json();

    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
    console.log(`Bot username: @${data.result.username}`);
  });

  it("should have valid ADMIN_CHAT_ID", () => {
    const chatId = process.env.ADMIN_CHAT_ID;
    expect(chatId).toBeTruthy();
    expect(Number(chatId)).toBeGreaterThan(0);
    expect(Number.isInteger(Number(chatId))).toBe(true);
  });
});
