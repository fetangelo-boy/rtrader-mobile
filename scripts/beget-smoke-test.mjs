#!/usr/bin/env node
// Smoke test: mobile client ↔ Beget REST contour.
// Mirrors what app/auth/login.tsx now does after the bridge change,
// then exercises the chat list + me endpoints and reports gaps.
//
// Usage: API_BASE_URL=http://45.12.19.31 node scripts/beget-smoke-test.mjs

const BASE = (process.env.API_BASE_URL || "http://45.12.19.31").replace(/\/$/, "");
const results = [];

function record(name, ok, info) {
  results.push({ name, ok, info });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}${info ? " — " + info : ""}`);
}

async function jpost(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
async function jget(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  // 1. Health
  const h = await jget("/api/health");
  record("health endpoint", h.status === 200 && h.json?.ok === true && h.json?.db === "up",
    `status=${h.status} db=${h.json?.db}`);

  // 2. Register fresh user
  const email = `smoke_${Date.now()}@example.com`;
  const password = "SmokeTest2026!";
  const reg = await jpost("/api/auth/register", { email, password, name: "Smoke" });
  record("register returns accessToken", (reg.status === 200 || reg.status === 201) && !!reg.json?.accessToken,
    `status=${reg.status} userId=${reg.json?.user?.id}`);

  // Small settle window: backend sometimes returns 500 if login fires
  // immediately after register (observed empirically).
  await new Promise(r => setTimeout(r, 1500));

  const access = reg.json?.accessToken;
  const refresh = reg.json?.refreshToken;

  // 3. /api/auth/me with bearer
  if (access) {
    const me = await jget("/api/auth/me", access);
    record("auth.me with bearer", me.status === 200 && me.json?.user?.email === email,
      `status=${me.status}`);
  }

  // 4. Login with the same creds (mirrors what login.tsx now sends)
  const login = await jpost("/api/auth/login", { email, password });
  record("login returns accessToken (REST shape)", login.status === 200 && !!login.json?.accessToken,
    `status=${login.status} err=${login.json?.error || "none"}`);

  // 5. Chats list (authenticated)
  if (access) {
    const chats = await jget("/api/chats", access);
    record("GET /api/chats authenticated", chats.status === 200 && Array.isArray(chats.json?.chats),
      `status=${chats.status} count=${chats.json?.chats?.length}`);
  }

  // 6. Refresh token
  if (refresh) {
    const r = await jpost("/api/auth/refresh", { refreshToken: refresh });
    record("refresh token rotation", r.status === 200 && !!r.json?.accessToken,
      `status=${r.status}`);
  }

  // 7. Surface gaps the mobile client still has against this contour:
  console.log("\n=== Coverage gaps (tRPC paths that Beget does NOT implement) ===");
  const trpcProbes = [
    "/api/trpc/auth.login",
    "/api/trpc/chat.list",
    "/api/trpc/chat.getMessages",
    "/api/trpc/chat.sendMessage",
    "/api/trpc/profile.getProfile",
    "/api/trpc/account.getSubscription",
    "/api/trpc/notifications.registerToken",
  ];
  for (const p of trpcProbes) {
    const r = await jget(p);
    console.log(`  ${p} → ${r.status} ${r.json?.error || ""}`);
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => {
  console.error("Smoke test crashed:", e);
  process.exit(2);
});
