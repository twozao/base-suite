-- The starter's profile trigger ran as security definer with a mutable search_path. Pin it like every
-- other definer function here; supabase/tests/rls_test.sql now asserts this for all of them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;
