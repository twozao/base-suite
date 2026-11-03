-- Behavioural checks for the migrations. Fails loudly on any violation.
-- Users: a = admin, b = regular user, c = editor, d = support, e = another regular user.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'user@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'editor@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'support@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'other@example.com');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'editor'),
  ('00000000-0000-0000-0000-00000000000d', 'support');
insert into public.cms_pages (slug, title, status) values ('about', 'About', 'published'), ('secret', 'Draft', 'draft');
insert into public.cms_page_revisions (page_id, title, body_md)
  select id, 'About', '' from public.cms_pages where slug = 'about';
insert into public.posts (slug, title, status, published_at) values ('hello', 'Hello', 'published', now()), ('wip', 'WIP', 'draft', null);
insert into public.chat_conversations (id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e');
insert into public.crm_contacts (id, email, name) values ('20000000-0000-0000-0000-000000000001', 'lead@example.com', 'Lead');
insert into public.crm_deals (contact_id, title) values ('20000000-0000-0000-0000-000000000001', 'Deal');
insert into public.crm_activities (contact_id, kind, body) values ('20000000-0000-0000-0000-000000000001', 'note', 'called');
insert into public.newsletter_subscribers (email, unsubscribe_token_hash) values ('n@example.com', repeat('a', 64));
insert into public.subscriptions (id, user_id, stripe_customer_id, status) values
  ('sub_b', '00000000-0000-0000-0000-00000000000b', 'cus_b', 'active'),
  ('sub_e', '00000000-0000-0000-0000-00000000000e', 'cus_e', 'active');
insert into public.bookings (external_id, user_id, invitee_email) values
  ('ev_b', '00000000-0000-0000-0000-00000000000b', 'user@example.com'),
  ('ev_e', '00000000-0000-0000-0000-00000000000e', 'other@example.com');
insert into public.stripe_customers (user_id, stripe_customer_id) values ('00000000-0000-0000-0000-00000000000b', 'cus_b');
insert into public.stripe_events (id, type) values ('evt_1', 'customer.subscription.created');
insert into public.site_settings (key, value) values ('brand', '{}'::jsonb);
insert into public.audit_log (actor_id, action) values ('00000000-0000-0000-0000-00000000000a', 'settings.updated');
insert into public.contact_requests (email, message_body) values ('visitor@example.com', 'hello');
do $$ begin
  perform public.analytics_hit('/', 'google.com');
  perform public.analytics_hit('/', 'google.com');
end $$;
insert into public.chat_messages (conversation_id, sender, body) values ('10000000-0000-0000-0000-000000000001', 'visitor', 'hi');

do $$ begin
  assert (select count(*) from public.profiles) = 5, 'handle_new_user creates a profile per user';
  assert (select unread_by_staff from public.chat_conversations where id = '10000000-0000-0000-0000-000000000001') = 1, 'trigger should bump unread_by_staff';
  assert (select views from public.analytics_daily where path = '/') = 2, 'analytics_hit increments';
  assert public.rate_limit_hit('t', 60, 2), 'hit 1 allowed';
  assert public.rate_limit_hit('t', 60, 2), 'hit 2 allowed';
  assert not public.rate_limit_hit('t', 60, 2), 'hit 3 blocked';
  assert (select count(*) from public.admin_list_users('example', 10, 0)) = 5, 'admin_list_users search';
  assert (select total_count from public.admin_list_users('admin', 10, 0) limit 1) = 1, 'total_count';
end $$;

-- Structural rules the migrations promise, checked rather than trusted.
do $$ declare bad text; begin
  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  assert bad is null, 'tables without row level security: ' || bad;

  select string_agg(tablename || '.' || policyname, ', ') into bad
  from pg_policies where schemaname = 'public' and cmd <> 'SELECT' and tablename <> 'profiles';
  assert bad is null, 'write policies for API roles outside profiles: ' || bad;

  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  assert bad is null, 'security definer functions without a pinned search_path: ' || bad;
end $$;

-- Anonymous visitor
set role anon;
do $$ begin
  assert (select count(*) from public.cms_pages) = 1, 'anon sees only published pages';
  assert (select count(*) from public.posts) = 1, 'anon sees only published posts';
  assert (select count(*) from public.chat_messages) = 0, 'anon sees no chat';
  assert (select count(*) from public.chat_conversations) = 0, 'anon sees no conversations';
  assert (select count(*) from public.user_roles) = 0, 'anon sees no roles';
  assert (select count(*) from public.profiles) = 0, 'anon sees no profiles';
  assert (select count(*) from public.newsletter_subscribers) = 0, 'anon sees no subscribers';
  assert (select count(*) from public.crm_contacts) = 0, 'anon sees no CRM';
  assert (select count(*) from public.crm_deals) = 0, 'anon sees no deals';
  assert (select count(*) from public.crm_activities) = 0, 'anon sees no activities';
  assert (select count(*) from public.analytics_daily) = 0, 'anon sees no analytics';
  assert (select count(*) from public.analytics_referrers) = 0, 'anon sees no referrers';
  assert (select count(*) from public.subscriptions) = 0, 'anon sees no subscriptions';
  assert (select count(*) from public.bookings) = 0, 'anon sees no bookings';
  assert (select count(*) from public.contact_requests) = 0, 'anon sees no contact requests';
  assert (select count(*) from public.stripe_customers) = 0, 'anon sees no stripe customers';
  assert (select count(*) from public.stripe_events) = 0, 'anon sees no stripe events';
  assert (select count(*) from public.rate_limits) = 0, 'anon sees no rate limits';
  assert (select count(*) from public.site_settings) = 0, 'anon sees no settings';
  assert (select count(*) from public.audit_log) = 0, 'anon sees no audit log';
  assert (select count(*) from public.cms_page_revisions) = 0, 'anon sees no revisions';
end $$;
do $$ begin
  begin
    insert into public.contact_requests (email, message_body) values ('x@y.z', 'spam');
    raise exception 'anon could write contact_requests directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'anon.png');
    raise exception 'anon could upload to the media bucket';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Regular user
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.chat_messages) = 1, 'user sees own messages';
  assert (select count(*) from public.chat_conversations) = 1, 'user sees only own conversation';
  assert (select count(*) from public.cms_pages) = 1, 'user sees only published pages';
  assert (select count(*) from public.profiles) = 1, 'user sees only own profile';
  assert (select id from public.subscriptions) = 'sub_b', 'user sees only own subscription';
  assert (select external_id from public.bookings) = 'ev_b', 'user sees only own booking';
  assert not public.has_role('admin'), 'user is not admin';
  assert (select count(*) from public.audit_log) = 0, 'user sees no audit log';
  assert (select count(*) from public.site_settings) = 0, 'user sees no settings';
  assert (select count(*) from public.stripe_customers) = 0, 'user sees no stripe customers';
  assert (select count(*) from public.cms_page_revisions) = 0, 'user sees no revisions';
  assert (select count(*) from public.contact_requests) = 0, 'user sees no contact requests';
  assert (select count(*) from public.analytics_referrers) = 0, 'user sees no referrers';
end $$;
do $$ begin
  begin
    insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'admin');
    raise exception 'privilege escalation was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.cms_pages set body_html = '<script>x</script>' where slug = 'about';
    if found then raise exception 'user could write cms_pages'; end if;
    update public.posts set body_html = '<script>x</script>' where slug = 'hello';
    if found then raise exception 'user could write posts'; end if;
  exception when insufficient_privilege then null;
  end;
  update public.profiles set full_name = 'pwned' where id = '00000000-0000-0000-0000-00000000000a';
  if found then raise exception 'user could update another profile'; end if;
  update public.profiles set full_name = 'me' where id = '00000000-0000-0000-0000-00000000000b';
  if not found then raise exception 'user could not update own profile'; end if;
  begin
    insert into public.subscriptions (id, user_id, stripe_customer_id, status)
      values ('sub_fake', '00000000-0000-0000-0000-00000000000b', 'cus_b', 'active');
    raise exception 'user could write subscriptions';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.bookings (external_id, user_id) values ('ev_fake', '00000000-0000-0000-0000-00000000000b');
    raise exception 'user could write bookings';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender, body)
      values ('10000000-0000-0000-0000-000000000001', 'staff', 'fake staff reply');
    raise exception 'user could write chat_messages directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rate_limit_hit('x', 1, 1);
    raise exception 'rate_limit_hit callable by users';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.analytics_hit('/x', null);
    raise exception 'analytics_hit callable by users';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.crm_contacts (email, name) values ('x@y.z', 'x');
    raise exception 'user could write CRM';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_users(null, 10, 0);
    raise exception 'admin_list_users callable by users';
  exception when insufficient_privilege then null;
  end;
  insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000b/me.png');
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/me.png');
    raise exception 'user could upload into another user''s avatar folder';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'user.png');
    raise exception 'user could upload to the media bucket';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Editor
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.cms_pages) = 2, 'editor sees drafts';
  assert (select count(*) from public.posts) = 2, 'editor sees draft posts';
  assert (select count(*) from public.cms_page_revisions) = 1, 'editor sees revisions';
  assert (select count(*) from public.newsletter_subscribers) = 1, 'editor sees subscribers';
  assert (select count(*) from public.analytics_referrers) = 1, 'editor sees referrers';
  assert (select count(*) from public.chat_messages) = 0, 'editor cannot read chat';
  assert (select count(*) from public.crm_contacts) = 0, 'editor cannot read CRM';
  assert (select count(*) from public.crm_deals) = 0, 'editor cannot read deals';
  assert (select count(*) from public.subscriptions) = 0, 'editor cannot read subscriptions';
  assert (select count(*) from public.bookings) = 0, 'editor cannot read bookings';
  assert (select count(*) from public.site_settings) = 0, 'editor cannot read settings';
  assert (select count(*) from public.audit_log) = 0, 'editor cannot read the audit log';
end $$;
reset role;

-- Support
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  assert public.has_role('support'), 'support role resolves';
  assert not public.has_role('editor'), 'support is not editor';
  assert (select count(*) from public.chat_conversations) = 2, 'support reads every conversation';
  assert (select count(*) from public.chat_messages) = 1, 'support reads chat';
  assert (select count(*) from public.contact_requests) = 1, 'support reads contact requests';
  assert (select count(*) from public.bookings) = 2, 'support reads every booking';
  assert (select count(*) from public.crm_contacts) = 1, 'support reads CRM';
  assert (select count(*) from public.crm_deals) = 1, 'support reads deals';
  assert (select count(*) from public.crm_activities) = 1, 'support reads activities';
  assert (select count(*) from public.cms_pages) = 1, 'support sees only published pages';
  assert (select count(*) from public.newsletter_subscribers) = 0, 'support cannot read subscribers';
  assert (select count(*) from public.subscriptions) = 0, 'support cannot read subscriptions';
  assert (select count(*) from public.site_settings) = 0, 'support cannot read settings';
  assert (select count(*) from public.audit_log) = 0, 'support cannot read the audit log';
end $$;
reset role;

-- Admin
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert public.has_role('support'), 'admin implies support';
  assert public.has_role('editor'), 'admin implies editor';
  assert (select count(*) from public.chat_messages) = 1, 'admin reads chat';
  assert (select count(*) from public.crm_contacts) = 1, 'admin reads CRM';
  assert (select count(*) from public.subscriptions) = 2, 'admin reads every subscription';
  assert (select count(*) from public.site_settings) = 1, 'admin reads settings';
  assert (select count(*) from public.audit_log) = 1, 'admin reads the audit log';
  assert (select count(*) from public.profiles) = 1, 'profiles stay self-only even for admins (admin pages use the service role)';
end $$;
reset role;
\echo 'RLS tests passed'
