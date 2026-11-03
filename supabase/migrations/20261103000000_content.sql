-- =============================================================================
-- Content: blog posts managed from the admin portal, and a public media bucket
-- for images (logo, blog covers, page images). Same security model as the
-- platform migration: RLS on, public read of published content only, all
-- writes through the server after a permission check.
-- =============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  title text not null check (length(title) between 1 and 200),
  excerpt text check (length(excerpt) <= 500),
  body_md text not null default '' check (length(body_md) <= 200000),
  body_html text not null default '',
  cover_image_url text check (length(cover_image_url) <= 1000),
  author_name text check (length(author_name) <= 120),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
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
alter table public.posts enable row level security;
create index posts_published_idx on public.posts (published_at desc) where status = 'published';
create index posts_status_idx on public.posts (status, updated_at desc);
create index posts_tags_idx on public.posts using gin (tags);

create policy "Anyone can read published posts" on public.posts
  for select using (status = 'published');
create policy "Editors can read all posts" on public.posts
  for select using (public.has_role('editor'));

-- Public media bucket. Files are uploaded by the server (service role) after
-- an editor permission check; anyone may read them.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Media is publicly readable" on storage.objects
  for select using (bucket_id = 'media');
