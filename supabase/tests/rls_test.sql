-- Behavioural checks for the platform migration. Fails loudly on any violation.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'user@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'editor@example.com');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'editor');
insert into public.cms_pages (slug, title, status) values ('about', 'About', 'published'), ('secret', 'Draft', 'draft');
insert into public.posts (slug, title, status, published_at) values ('hello', 'Hello', 'published', now()), ('wip', 'WIP', 'draft', null);
insert into public.chat_conversations (id, user_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into public.chat_messages (conversation_id, sender, body) values ('10000000-0000-0000-0000-000000000001', 'visitor', 'hi');

do $$ begin
  assert (select unread_by_staff from public.chat_conversations) = 1, 'trigger should bump unread_by_staff';
  assert public.rate_limit_hit('t', 60, 2), 'hit 1 allowed';
  assert public.rate_limit_hit('t', 60, 2), 'hit 2 allowed';
  assert not public.rate_limit_hit('t', 60, 2), 'hit 3 blocked';
  assert (select count(*) from public.admin_list_users('example', 10, 0)) = 3, 'admin_list_users search';
  assert (select total_count from public.admin_list_users('admin', 10, 0) limit 1) = 1, 'total_count';
end $$;

-- Anonymous visitor
set role anon;
do $$ begin
  assert (select count(*) from public.cms_pages) = 1, 'anon sees only published pages';
  assert (select count(*) from public.posts) = 1, 'anon sees only published posts';
  assert (select count(*) from public.chat_messages) = 0, 'anon sees no chat';
  assert (select count(*) from public.user_roles) = 0, 'anon sees no roles';
end $$;
reset role;

-- Regular user
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.chat_messages) = 1, 'user sees own messages';
  assert (select count(*) from public.cms_pages) = 1, 'user sees only published pages';
  assert not public.has_role('admin'), 'user is not admin';
  assert (select count(*) from public.audit_log) = 0;
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
  begin
    perform public.rate_limit_hit('x', 1, 1);
    raise exception 'rate_limit_hit callable by users';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_users(null, 10, 0);
    raise exception 'admin_list_users callable by users';
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
  assert (select count(*) from public.chat_messages) = 0, 'editor cannot read chat';
end $$;
reset role;

-- Admin
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert public.has_role('support'), 'admin implies support';
  assert (select count(*) from public.chat_messages) = 1, 'admin reads chat';
end $$;
reset role;
\echo 'RLS tests passed'
