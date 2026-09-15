-- Security hardening. Nothing here changes who may read or write what under
-- normal use; it closes the gaps around the edges of 0016_roles.sql.
--
-- Needs only 0016_roles.sql before it. Safe to re-run.


-- 1. Sign-up can no longer mint a manager once the team exists.
--
-- 0016 made a new sign-up a manager whenever no manager existed. Sign-up is
-- open, so if the last manager's login were ever deleted, the next stranger to
-- register would be handed the books. Now only the very first profile ever is
-- a manager — an empty project bootstrapping itself. A team that has lost every
-- manager is recovered from the SQL editor, not from the sign-up form.
--
-- The lock serialises concurrent sign-ups, so two people registering on an
-- empty project in the same instant cannot both become manager.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.handle_new_user'));

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    case
      when exists (select 1 from public.profiles) then null
      else 'manager'::public.app_role
    end
  )
  on conflict (id) do nothing;
  return new;
end
$$;


-- 2. The last manager cannot be removed by deletion either.
--
-- 0016 guarded updates to `role` only. Deleting the login cascades to the
-- profile and skipped that guard. The lock also closes a race: two managers
-- demoting each other at once could each see the other still standing.

create or replace function public.keep_one_manager()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'manager'
     and (tg_op = 'DELETE' or new.role is distinct from 'manager')
  then
    perform pg_advisory_xact_lock(hashtext('public.keep_one_manager'));

    if not exists (
      select 1 from public.profiles
      where role = 'manager' and id <> old.id
    ) then
      raise exception 'There has to be at least one manager.'
        using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_keep_one_manager on public.profiles;
create trigger profiles_keep_one_manager
  before update of role on public.profiles
  for each row execute function public.keep_one_manager();

drop trigger if exists profiles_keep_one_manager_on_delete on public.profiles;
create trigger profiles_keep_one_manager_on_delete
  before delete on public.profiles
  for each row execute function public.keep_one_manager();


-- 3. "Who entered it" is always the person who entered it.
--
-- `user_id` defaults to the caller, but nothing stopped a request from sending
-- someone else's id, or from rewriting it later. It no longer decides access
-- (0016), yet it is the only audit trail the books have. The service role has
-- no `auth.uid()` and keeps whatever it supplies.

create or replace function public.stamp_entered_by()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;
  else
    new.user_id := old.user_id;
  end if;
  return new;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'budgets', 'categories', 'accounts'] loop
    execute format('drop trigger if exists %1$s_stamp_entered_by on public.%1$I', t);
    execute format(
      'create trigger %1$s_stamp_entered_by
         before insert or update on public.%1$I
         for each row execute function public.stamp_entered_by()', t);
  end loop;
end
$$;


-- 4. Functions: only who needs them.
--
-- Postgres grants EXECUTE to PUBLIC on every new function, which includes the
-- signed-out `anon` role. Trigger functions are never called directly (firing
-- a trigger does not check EXECUTE), and the reports are for signed-in users.

revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.keep_one_manager() from public, anon, authenticated;
revoke execute on function public.stamp_entered_by() from public, anon, authenticated;

revoke execute on function public.app_role() from public, anon;
grant  execute on function public.app_role() to authenticated;

revoke execute on function public.report_monthly_totals(date, date, boolean, text, boolean, boolean)
  from public, anon;
grant execute on function public.report_monthly_totals(date, date, boolean, text, boolean, boolean)
  to authenticated;

revoke execute on function public.report_account_totals(date, date, boolean) from public, anon;
grant  execute on function public.report_account_totals(date, date, boolean) to authenticated;


-- 5. Tables: signed-out visitors get nothing, even if a policy is ever wrong.
--
-- Every table has row level security and no policy names `anon`, so this
-- changes nothing today. It is the second lock: a table accidentally left with
-- RLS off, or a policy written `to public`, still would not leak to the world.
-- TRUNCATE ignores row level security altogether, so nobody outside the
-- database owner gets that either.

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'budgets', 'categories', 'accounts', 'profiles'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
  end loop;
end
$$;


-- 6. Fail loudly if any table in `public` is exposed without row level security
-- — including ones added after this file. Re-run this migration to re-check.

do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ')
    into missing
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')
     and not c.relrowsecurity;

  if missing is not null then
    raise exception 'Row level security is off on: %', missing;
  end if;
end
$$;
