-- Deleting a user keeps what they entered.
--
-- Every table's `user_id` was `on delete cascade`, from when each person only
-- saw their own books. The books are shared now (0016), so deleting a login
-- would take the team's transactions, accounts and employees with it. Instead
-- the rows stay and lose their author.
--
-- Run after 0025_custom_roles.sql. Safe to re-run.


-- 1. `user_id` may be empty, and empties itself when the login goes.

do $$
declare
  t text;
  fk text;
begin
  foreach t in array array[
    'transactions', 'budgets', 'categories', 'accounts', 'employees', 'departments'
  ] loop
    execute format('alter table public.%I alter column user_id drop not null', t);

    for fk in
      select c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.conrelid = format('public.%I', t)::regclass
        and c.contype = 'f'
        and c.confrelid = 'auth.users'::regclass
        and a.attname = 'user_id'
    loop
      execute format('alter table public.%I drop constraint %I', t, fk);
    end loop;

    execute format(
      'alter table public.%1$I add constraint %1$s_user_id_fkey
         foreign key (user_id) references auth.users (id) on delete set null', t);
  end loop;
end
$$;


-- 2. "Who entered it" still cannot be rewritten (0021 §3), except to empty it
-- once that login no longer exists — which is what `on delete set null` does.
-- Security definer so it can look in auth.users.

create or replace function public.stamp_entered_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;
    return new;
  end if;

  if new.user_id is null and old.user_id is not null then
    if not exists (select 1 from auth.users where id = old.user_id) then
      return new;
    end if;
  end if;

  new.user_id := old.user_id;
  return new;
end
$$;

revoke execute on function public.stamp_entered_by() from public, anon, authenticated;


-- 3. The last manager cannot be deleted. `keep_one_manager` already handles
-- DELETE (0021 §2), but its trigger only ever fired on role updates.

drop trigger if exists profiles_keep_one_manager on public.profiles;
create trigger profiles_keep_one_manager
  before update of role or delete on public.profiles
  for each row execute function public.keep_one_manager();


-- 4. The app asks for this before deleting anyone. Without it the foreign keys
-- above may still cascade, and a delete would take the user's records along.

create or replace function public.deleting_users_keeps_records()
returns boolean
language sql
stable
as $$
  select true
$$;

revoke execute on function public.deleting_users_keeps_records() from public, anon, authenticated;
grant execute on function public.deleting_users_keeps_records() to service_role;
