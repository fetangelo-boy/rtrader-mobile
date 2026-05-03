-- ============================================================
-- posts table — universal VIP club content feed
-- ============================================================
-- Architecture: author publishes content → stored here →
-- Supabase Realtime pushes to all subscribed clients instantly.
--
-- Source-agnostic: content can come from:
--   - Telegram channel (via Edge Function webhook)
--   - Manual admin post (via admin API)
--   - Any future source
--
-- Media strategy:
--   - Photos: stored in Supabase Storage, media_url = public URL
--   - Videos: stored on Telegram servers, file_id = Telegram file_id
--     (resolved to temp URL on demand via media-proxy Edge Function)
--   - Documents: stored in Supabase Storage, media_url = public URL
-- ============================================================

create table if not exists public.posts (
  id            bigserial primary key,

  -- Which chat/channel this post belongs to (e.g. 'channel-main', 'chat-7')
  -- Nullable: a post can be global (visible to all subscribers) or scoped to a channel
  chat_id       text,

  -- Post text content (nullable — post may be media-only)
  content       text,

  -- Media type: 'photo' | 'video' | 'document' | null
  media_type    text check (media_type in ('photo', 'video', 'document', null)),

  -- Direct URL to media (Supabase Storage for photos/docs, null for videos)
  media_url     text,

  -- Telegram file_id for videos (resolved via media-proxy on demand)
  file_id       text,

  -- Source of the post for audit and routing logic
  -- 'telegram' = came via Telegram webhook
  -- 'manual'   = created by admin directly
  source        text not null default 'manual'
                  check (source in ('telegram', 'manual')),

  -- Telegram message_id for deduplication (nullable for manual posts)
  telegram_message_id bigint unique,

  -- Author display name (Telegram sender name or admin name)
  author_name   text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast feed queries (newest first per channel)
create index if not exists posts_chat_id_created_at_idx
  on public.posts (chat_id, created_at desc);

-- Index for global feed (no chat_id filter)
create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

-- Auto-update updated_at on row change
create or replace function public.handle_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_posts_updated on public.posts;
create trigger on_posts_updated
  before update on public.posts
  for each row execute procedure public.handle_posts_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.posts enable row level security;

-- Authenticated users can read all posts
-- (subscription check is done at the app level via useSubscriptionGuard)
create policy "Authenticated users can read posts"
  on public.posts for select
  to authenticated
  using (true);

-- Only service_role can insert/update/delete
-- (Edge Functions run as service_role)
create policy "Service role can manage posts"
  on public.posts for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- Realtime
-- ============================================================
-- Enable Realtime for this table so clients get instant updates
-- Note: must also be enabled in Supabase Dashboard → Database → Replication
-- or via: alter publication supabase_realtime add table public.posts;

alter publication supabase_realtime add table public.posts;
