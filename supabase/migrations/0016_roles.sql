-- Roles: one shared ledger, read by the whole team, changed only by managers.
--
-- Until now every row belonged to whoever entered it and nobody else could see
-- it. The business has one set of books, so that no longer fits once more than
-- one person signs in: an admin who opens the dashboard has to see the
-- manager's figures, not an empty ledger of their own.
--
--   manager — everything, including who else gets in and as what
--   admin   — reads the Dashboard and the Laporan Keuangan, changes nothing
--   (null)  — signed up, not yet let in; reads nothing
--
-- `user_id` stays on every table as "who entered it", but no longer decides
-- who may see the row.
--
-- Run after 0015_report_settlement_filters.sql. Safe to re-run.


-- 1. Who is who.

do $$ begin
  create type public.app_role as enum ('manager', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null default '',
  full_name  text,
  -- Null until a manager lets them in. Signing up is open, and the books are
  -- not, so a new account starts with no access rather than read access.
  role       public.app_role,
  created_at timestamptz not null default now()
);

-- The signed-in user's role. `security definer` so policies can call it
-- without re-entering the policies on `profiles` itself.
create or replace function public.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.app_role() from public;
grant execute on function public.app_role() to authenticated;


-- 2. Everyone already signed up was running their own books as a manager, so
-- they stay managers.

insert into public.profiles (id, email, full_name, role)
select u.id, coalesce(u.email, ''), u.raw_user_meta_data ->> 'full_name', 'manager'
from auth.users u
on conflict (id) do nothing;


-- 3. New sign-ups get a profile with no role — except the very first, who
-- would otherwise have nobody to let them in.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    case
      when exists (select 1 from public.profiles where role = 'manager') then null
      else 'manager'::public.app_role
    end
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 4. The team can never be left without a manager: nobody would be able to
-- let anyone in, or change a figure, ever again.

create or replace function public.keep_one_manager()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'manager'
     and new.role is distinct from 'manager'
     and not exists (
       select 1 from public.profiles
       where role = 'manager' and id <> old.id
     )
  then
    raise exception 'There has to be at least one manager.'
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_keep_one_manager on public.profiles;
create trigger profiles_keep_one_manager
  before update of role on public.profiles
  for each row execute function public.keep_one_manager();


-- 5. Profiles: you can see yourself; managers see and re-role everyone. Only
-- the role column is writable — email and name come from auth.

alter table public.profiles enable row level security;

drop policy if exists "read own or all as manager" on public.profiles;
create policy "read own or all as manager" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.app_role()) = 'manager');

drop policy if exists "managers set roles" on public.profiles;
create policy "managers set roles" on public.profiles
  for update to authenticated
  using ((select public.app_role()) = 'manager')
  with check ((select public.app_role()) = 'manager');

revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (role) on public.profiles to authenticated;


-- 6. The books: anyone with a role reads, managers write.
--
-- The role is looked up through a scalar sub-select so it is evaluated once
-- per query rather than once per row (see 0006).

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'budgets', 'categories', 'accounts'] loop
    execute format('drop policy if exists "own %1$s" on public.%1$I', t);
    execute format('drop policy if exists "team reads %1$s" on public.%1$I', t);
    execute format('drop policy if exists "managers add %1$s" on public.%1$I', t);
    execute format('drop policy if exists "managers change %1$s" on public.%1$I', t);
    execute format('drop policy if exists "managers remove %1$s" on public.%1$I', t);

    execute format(
      'create policy "team reads %1$s" on public.%1$I for select to authenticated
         using ((select public.app_role()) is not null)', t);
    execute format(
      'create policy "managers add %1$s" on public.%1$I for insert to authenticated
         with check ((select public.app_role()) = ''manager'')', t);
    execute format(
      'create policy "managers change %1$s" on public.%1$I for update to authenticated
         using ((select public.app_role()) = ''manager'')
         with check ((select public.app_role()) = ''manager'')', t);
    execute format(
      'create policy "managers remove %1$s" on public.%1$I for delete to authenticated
         using ((select public.app_role()) = ''manager'')', t);
  end loop;
end
$$;


-- 7. Names are unique across the business now, not per person — two "BCA"
-- accounts would be two different places for the same money.
--
-- If more than one person already entered the same account or category name
-- this step fails; rename or remove the duplicate and run it again.

alter table public.accounts drop constraint if exists accounts_unique_name;
alter table public.accounts
  add constraint accounts_unique_name unique (name);

alter table public.categories drop constraint if exists categories_unique_per_kind_section;
alter table public.categories
  add constraint categories_unique_per_kind_section unique (kind, section, name);


-- 8. Reports no longer narrow by user, so the covering index they scan leads
-- with the date instead.

drop index if exists public.transactions_report_idx;
create index if not exists transactions_report_idx
  on public.transactions (occurred_on)
  include (kind, category, amount, account, paid);
