-- =============================================================================
-- Platform modules: roles & admin, audit log, settings, rate limiting,
-- contact inbox, CMS pages, live chat support, bookings (Calendly) and a
-- Stripe subscription mirror.
--
-- Security model
--   * Every table has Row Level Security enabled.
--   * Reads that the browser may do directly are covered by narrow policies.
--   * All writes go through SvelteKit server code using the service role,
--     AFTER an explicit permission check (see src/lib/server/auth). There are
--     deliberately no INSERT/UPDATE/DELETE policies for end users on the new
--     tables, so a leaked anon key cannot write to them.
--   * Roles live in their own table (not on `profiles`, which users can
--     update) so users can never grant themselves a role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'editor', 'support');

create table public.user_roles (
  user_id uuid not null references auth.users on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

create policy "Users can read their own roles" on public.user_roles
  for select using (auth.uid() = user_id);

-- True if the current user holds role `r`. Admins implicitly hold every role.
create or replace function public.has_role(r public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and (ur.role = r or ur.role = 'admin')
  );
$$;

-- -----------------------------------------------------------------------------
-- Audit log (append-only from the server)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users on delete set null,
  action text not null check (length(action) <= 100),
  target_type text check (length(target_type) <= 50),
  target_id text check (length(target_id) <= 200),
  meta jsonb not null default '{}'::jsonb,
  ip text check (length(ip) <= 64),
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

create policy "Admins can read the audit log" on public.audit_log
  for select using (public.has_role('admin'));

-- -----------------------------------------------------------------------------
-- Site settings (key/value, validated in the app with zod)
-- -----------------------------------------------------------------------------
create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  value jsonb not null,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;

create policy "Admins can read settings" on public.site_settings
  for select using (public.has_role('admin'));

-- -----------------------------------------------------------------------------
-- Rate limiting (fixed window, atomic upsert). Server-only.
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key text primary key check (length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;

-- Returns true when the call is within the limit.
create or replace function public.rate_limit_hit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds)
        then 1
      else rl.hits + 1
    end,
    window_start = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds)
        then now()
      else rl.window_start
    end
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- Housekeeping: drop windows older than a day.
create or replace function public.rate_limit_prune()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

-- Supabase grants EXECUTE to anon/authenticated by default, so revoke
-- explicitly from them as well as from PUBLIC.
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rate_limit_prune() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.rate_limit_prune() to service_role;

-- -----------------------------------------------------------------------------
-- Contact inbox (extends the starter's contact_requests table)
-- -----------------------------------------------------------------------------
alter table public.contact_requests
  add column created_at timestamptz not null default now(),
  add column status text not null default 'new'
    check (status in ('new', 'open', 'closed', 'spam')),
  add column admin_notes text check (length(admin_notes) <= 10000),
  add column handled_by uuid references auth.users on delete set null;

create index contact_requests_status_idx
  on public.contact_requests (status, created_at desc);

create policy "Support staff can read contact requests" on public.contact_requests
  for select using (public.has_role('support'));

-- -----------------------------------------------------------------------------
-- CMS pages
-- body_html is ONLY written by the server after markdown rendering and
-- sanitisation, which is why there is no write policy for any user.
-- -----------------------------------------------------------------------------
create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  title text not null check (length(title) between 1 and 200),
  body_md text not null default '' check (length(body_md) <= 200000),
  body_html text not null default '',
  excerpt text check (length(excerpt) <= 500),
  seo_title text check (length(seo_title) <= 200),
  seo_description text check (length(seo_description) <= 500),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cms_pages enable row level security;
create index cms_pages_status_idx on public.cms_pages (status, updated_at desc);

create policy "Anyone can read published pages" on public.cms_pages
  for select using (status = 'published');
create policy "Editors can read all pages" on public.cms_pages
  for select using (public.has_role('editor'));

create table public.cms_page_revisions (
  id bigint generated always as identity primary key,
  page_id uuid not null references public.cms_pages on delete cascade,
  title text not null,
  body_md text not null,
  saved_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.cms_page_revisions enable row level security;
create index cms_page_revisions_page_idx
  on public.cms_page_revisions (page_id, created_at desc);

create policy "Editors can read revisions" on public.cms_page_revisions
  for select using (public.has_role('editor'));

-- -----------------------------------------------------------------------------
-- Live chat support
-- Anonymous visitors are identified by a random token held in an httpOnly
-- cookie; only its SHA-256 hash is stored.
-- -----------------------------------------------------------------------------
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  visitor_token_hash text unique check (length(visitor_token_hash) = 64),
  visitor_name text check (length(visitor_name) <= 200),
  visitor_email text check (length(visitor_email) <= 320),
  page_url text check (length(page_url) <= 2000),
  status text not null default 'open'
    check (status in ('open', 'pending', 'closed')),
  assigned_to uuid references auth.users on delete set null,
  unread_by_staff integer not null default 0,
  unread_by_visitor integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (user_id is not null or visitor_token_hash is not null)
);
alter table public.chat_conversations enable row level security;
create index chat_conversations_inbox_idx
  on public.chat_conversations (status, last_message_at desc);
create index chat_conversations_user_idx
  on public.chat_conversations (user_id, last_message_at desc);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations on delete cascade,
  sender text not null check (sender in ('visitor', 'staff', 'system')),
  author_id uuid references auth.users on delete set null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create index chat_messages_conversation_idx
  on public.chat_messages (conversation_id, id);

create policy "Support staff can read conversations" on public.chat_conversations
  for select using (public.has_role('support'));
create policy "Users can read their own conversations" on public.chat_conversations
  for select using (auth.uid() = user_id);
create policy "Support staff can read messages" on public.chat_messages
  for select using (public.has_role('support'));
create policy "Users can read messages in their conversations" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- Keep conversation counters in sync with new messages.
create or replace function public.chat_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_conversations set
    last_message_at = new.created_at,
    unread_by_staff = case when new.sender = 'visitor'
      then unread_by_staff + 1 else unread_by_staff end,
    unread_by_visitor = case when new.sender = 'staff'
      then unread_by_visitor + 1 else unread_by_visitor end,
    -- a visitor reply re-opens a closed conversation
    status = case when new.sender = 'visitor' and status = 'closed'
      then 'open' else status end
  where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function public.chat_on_message() from public, anon, authenticated;
create trigger chat_messages_after_insert
  after insert on public.chat_messages
  for each row execute procedure public.chat_on_message();

-- -----------------------------------------------------------------------------
-- Bookings (synced from Calendly webhooks)
-- -----------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'calendly' check (provider in ('calendly')),
  external_id text not null unique check (length(external_id) <= 500),
  event_uri text check (length(event_uri) <= 500),
  event_name text check (length(event_name) <= 300),
  invitee_name text check (length(invitee_name) <= 300),
  invitee_email text check (length(invitee_email) <= 320),
  user_id uuid references auth.users on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'canceled')),
  cancel_reason text check (length(cancel_reason) <= 2000),
  cancel_url text check (length(cancel_url) <= 1000),
  reschedule_url text check (length(reschedule_url) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create index bookings_start_idx on public.bookings (start_time desc);
create index bookings_user_idx on public.bookings (user_id, start_time desc);
create index bookings_email_idx on public.bookings (lower(invitee_email));

create policy "Support staff can read bookings" on public.bookings
  for select using (public.has_role('support'));
create policy "Users can read their own bookings" on public.bookings
  for select using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Stripe subscription mirror (written by the Stripe webhook)
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  stripe_customer_id text not null,
  status text not null,
  price_id text,
  product_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

create policy "Users can read their own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "Admins can read subscriptions" on public.subscriptions
  for select using (public.has_role('admin'));

-- Webhook idempotency: each Stripe event is processed once.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- -----------------------------------------------------------------------------
-- Admin user directory (joins auth.users, which the API can't query directly)
-- Service role only.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  full_name text,
  company_name text,
  roles public.app_role[],
  subscription_status text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with filtered as (
    select u.id, u.email::text as email, u.created_at, u.last_sign_in_at,
           p.full_name, p.company_name
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%'
       or p.full_name ilike '%' || p_search || '%'
       or p.company_name ilike '%' || p_search || '%'
  )
  select f.id, f.email, f.created_at, f.last_sign_in_at, f.full_name, f.company_name,
    coalesce(
      (select array_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = f.id),
      '{}'
    ),
    (select s.status from public.subscriptions s where s.user_id = f.id
       order by (s.status in ('active', 'trialing', 'past_due')) desc, s.updated_at desc
       limit 1),
    count(*) over ()
  from filtered f
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;
revoke all on function public.admin_list_users(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Harden the starter's avatar bucket: authenticated users may only write into
-- a folder named after their own user id.
-- -----------------------------------------------------------------------------
drop policy if exists "Anyone can upload an avatar." on storage.objects;
create policy "Users can upload their own avatar." on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
