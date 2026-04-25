# Architecture Analysis: rtrader11.ru (Site) vs rtrader-mobile (App)

## Site Backend (rtrader-hub)
- **Platform**: Serverless functions on poehali.dev (Python)
- **Database**: PostgreSQL (psycopg2)
- **Auth**: Custom (email+password+bcrypt, sessions in club_sessions)
- **Bot**: @rtrader_vip_bot via webhook to poehali.dev function
- **Tables**: club_users, club_sessions, club_subscriptions, club_chat, tg_link_tokens, club_invites, club_subscriptions_log
- **Payment flow**: User uploads receipt on site → admin approves in admin panel → bot notifies via TG
- **Reminders**: tg-notify function (cron) — 3 day, 1 day, 0 day before expiry

## Mobile App Backend (rtrader-mobile)
- **Platform**: Express + tRPC (Node.js/TypeScript)
- **Database**: MySQL (TiDB via Drizzle ORM) + Supabase (PostgreSQL for chats, auth)
- **Auth**: Supabase Auth (email+password) — separate from site auth
- **Bot**: @rtrader_vip_bot via polling (Python aiogram) — CONFLICTS with site webhook!
- **Tables (MySQL)**: users, subscription_requests
- **Tables (Supabase)**: chats, chat_participants, messages, profiles
- **Payment flow**: User sends receipt photo in TG bot → admin approves in bot → Supabase user created

## CRITICAL CONFLICT
The same bot token (8782194510:AAF...) is used by BOTH:
1. Site's webhook (https://functions.poehali.dev/4807e4da-...)
2. Mobile app's polling (rtrader_bot.py)

**Only one can be active at a time!** When mobile bot starts polling, it deletes the webhook → site bot stops working.

## Key Differences

| Aspect | Site | App |
|--------|------|-----|
| Auth | Custom bcrypt+sessions | Supabase Auth |
| DB | PostgreSQL | MySQL (TiDB) + Supabase PG |
| Users table | club_users | users (MySQL) + auth.users (Supabase) |
| Subscriptions | club_subscriptions | subscription_requests |
| Chat | club_chat (single table) | chats + chat_participants + messages (Supabase) |
| Bot delivery | Webhook (serverless) | Polling (long-running process) |
| Payment | Receipt uploaded on site | Receipt photo sent to bot |
| Admin panel | Web admin on site | Bot inline buttons |

## Incompatibilities
1. **Bot token conflict** — polling kills webhook
2. **Different user databases** — no shared identity
3. **Different auth systems** — can't cross-login
4. **Different subscription models** — site uses plans (week/month/quarter), app uses exact dates
5. **No data sync** — user on site ≠ user in app
