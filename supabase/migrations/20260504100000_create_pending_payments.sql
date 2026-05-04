-- pending_payments: stores user's selected plan while waiting for receipt
-- Used by Telegram bot Edge Function (stateless, needs persistence between calls)
CREATE TABLE IF NOT EXISTS pending_payments (
  telegram_id bigint PRIMARY KEY,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  price integer NOT NULL,
  days integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-expire after 24 hours (cleaned up by Edge Function or cron)
-- No RLS needed — only accessed via service_role key from Edge Function
