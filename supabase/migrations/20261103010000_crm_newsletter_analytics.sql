-- =============================================================================
-- Modules: CRM, Newsletter, Analytics.
-- Same model as before: RLS on, staff-only reads, all writes via the server.
-- =============================================================================

-- ----------------------------------------------------------------------------- CRM
create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  email text unique check (email is null or (email = lower(email) and length(email) <= 320)),
  name text check (length(name) <= 200),
  company text check (length(company) <= 200),
  phone text check (length(phone) <= 60),
  user_id uuid references auth.users on delete set null,
  status text not null default 'lead' check (status in ('lead', 'customer', 'archived')),
  source text check (length(source) <= 40),
  owner_id uuid references auth.users on delete set null,
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  notes text check (length(notes) <= 20000),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or name is not null)
);
alter table public.crm_contacts enable row level security;
create index crm_contacts_activity_idx on public.crm_contacts (status, last_activity_at desc);
create index crm_contacts_user_idx on public.crm_contacts (user_id);

create table public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts on delete cascade,
  title text not null check (length(title) between 1 and 200),
  value_cents bigint not null default 0 check (value_cents between 0 and 100000000000),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  stage text not null default 'new'
    check (stage in ('new', 'qualified', 'proposal', 'won', 'lost')),
  owner_id uuid references auth.users on delete set null,
  expected_close date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.crm_deals enable row level security;
create index crm_deals_stage_idx on public.crm_deals (stage, updated_at desc);
create index crm_deals_contact_idx on public.crm_deals (contact_id);

create table public.crm_activities (
  id bigint generated always as identity primary key,
  contact_id uuid not null references public.crm_contacts on delete cascade,
  kind text not null check (kind in ('note', 'call', 'email', 'meeting', 'chat', 'contact_form', 'booking', 'signup', 'newsletter', 'deal', 'subscription')),
  body text check (length(body) <= 5000),
  ref_type text check (length(ref_type) <= 40),
  ref_id text check (length(ref_id) <= 200),
  actor_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.crm_activities enable row level security;
create index crm_activities_contact_idx on public.crm_activities (contact_id, created_at desc);

create policy "Support staff can read CRM contacts" on public.crm_contacts
  for select using (public.has_role('support'));
create policy "Support staff can read CRM deals" on public.crm_deals
  for select using (public.has_role('support'));
create policy "Support staff can read CRM activities" on public.crm_activities
  for select using (public.has_role('support'));

-- ----------------------------------------------------------------------------- Newsletter
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) <= 320),
  name text check (length(name) <= 200),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  -- SHA-256 of the one-time confirm token and the long-lived unsubscribe token
  confirm_token_hash text check (length(confirm_token_hash) = 64),
  unsubscribe_token_hash text not null check (length(unsubscribe_token_hash) = 64),
  source text check (length(source) <= 100),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);
alter table public.newsletter_subscribers enable row level security;
create index newsletter_status_idx on public.newsletter_subscribers (status, created_at desc);
create unique index newsletter_confirm_idx on public.newsletter_subscribers (confirm_token_hash);
create unique index newsletter_unsub_idx on public.newsletter_subscribers (unsubscribe_token_hash);

create policy "Editors can read subscribers" on public.newsletter_subscribers
  for select using (public.has_role('editor'));

-- ----------------------------------------------------------------------------- Analytics
-- Aggregated counts only: no IPs, cookies, user ids or user agents stored.
create table public.analytics_daily (
  day date not null,
  path text not null check (length(path) <= 200),
  views integer not null default 0,
  primary key (day, path)
);
create table public.analytics_referrers (
  day date not null,
  host text not null check (length(host) <= 120),
  views integer not null default 0,
  primary key (day, host)
);
alter table public.analytics_daily enable row level security;
alter table public.analytics_referrers enable row level security;
create policy "Editors can read analytics" on public.analytics_daily
  for select using (public.has_role('editor'));
create policy "Editors can read referrers" on public.analytics_referrers
  for select using (public.has_role('editor'));

create or replace function public.analytics_hit(p_path text, p_host text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.analytics_daily as a (day, path, views)
  values (current_date, left(p_path, 200), 1)
  on conflict (day, path) do update set views = a.views + 1;
  if p_host is not null and p_host <> '' then
    insert into public.analytics_referrers as r (day, host, views)
    values (current_date, left(p_host, 120), 1)
    on conflict (day, host) do update set views = r.views + 1;
  end if;
end;
$$;
revoke all on function public.analytics_hit(text, text) from public, anon, authenticated;
grant execute on function public.analytics_hit(text, text) to service_role;
