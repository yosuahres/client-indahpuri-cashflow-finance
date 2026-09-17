-- Role permissions: what each role may do, ticked action by action in
-- Settings → Permissions, instead of fixed in code.
--
-- Until now a manager could do everything and an admin could only read the
-- Dashboard and the Laporan Keuangan. That split is now the starting grid; a
-- user manager changes it from the app. Every write the books accept is
-- checked against this grid, so the app hiding a button is never the
-- only thing standing in the way.
--
-- A dashboard is open to anyone with a role; everything past it is a
-- permission. Managers can never lose "Manage users, roles and permissions",
-- so there is always someone who can put the grid right.
--
-- Run after 0021_security_hardening.sql. Safe to re-run: the starting grid is
-- only written into an empty table, so choices made in the app stay.


-- 0. An earlier draft of this file kept per-person flags on profiles.

drop policy if exists "permitted add transactions" on public.transactions;
drop function if exists public.can_enter_transaction(public.transaction_kind);
alter table public.profiles
  drop column if exists can_enter_income,
  drop column if exists can_enter_expense;


-- 1. The grid. A row is a tick; no row, no permission.

create table if not exists public.role_permissions (
  role       public.app_role not null,
  permission text not null,
  primary key (role, permission)
);

-- Keep in step with PERMISSIONS in src/features/auth/permissions.ts.
alter table public.role_permissions drop constraint if exists role_permissions_known;
alter table public.role_permissions
  add constraint role_permissions_known check (permission in (
    'reports.view', 'profit_loss.view', 'budgets.view',
    'transactions.income', 'transactions.expense', 'transactions.edit',
    'budgets.manage', 'accounts.manage', 'categories.manage',
    'users.manage'
  ));

insert into public.role_permissions (role, permission)
select g.role::public.app_role, g.permission
from (values
  ('manager', 'reports.view'), ('manager', 'profit_loss.view'), ('manager', 'budgets.view'),
  ('manager', 'transactions.income'), ('manager', 'transactions.expense'), ('manager', 'transactions.edit'),
  ('manager', 'budgets.manage'), ('manager', 'accounts.manage'), ('manager', 'categories.manage'),
  ('manager', 'users.manage'),
  ('admin', 'reports.view')
) as g (role, permission)
where not exists (select 1 from public.role_permissions);


-- 2. Asking the grid. `security definer`, like `app_role()`, so policies can
-- call these without re-entering the policies on the tables they read.

create or replace function public.has_permission(wanted text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = auth.uid() and rp.permission = wanted
  )
$$;

-- Everything the signed-in user may do, in one call — what the app reads.
create or replace function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(rp.permission order by rp.permission), '{}')
  from public.profiles p
  join public.role_permissions rp on rp.role = p.role
  where p.id = auth.uid()
$$;

revoke execute on function public.has_permission(text) from public, anon;
grant  execute on function public.has_permission(text) to authenticated;
revoke execute on function public.my_permissions() from public, anon;
grant  execute on function public.my_permissions() to authenticated;


-- 3. Managers always keep user management.

create or replace function public.keep_manager_user_management()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'manager' and old.permission = 'users.manage' then
    raise exception 'Managers always manage users, roles and permissions.'
      using errcode = 'P0001';
  end if;
  return old;
end
$$;

revoke execute on function public.keep_manager_user_management() from public, anon, authenticated;

drop trigger if exists role_permissions_keep_manager on public.role_permissions;
create trigger role_permissions_keep_manager
  before delete on public.role_permissions
  for each row execute function public.keep_manager_user_management();


-- 4. The grid itself: anyone with a role reads it, user managers tick and
-- untick. A tick is added or removed, never edited.

alter table public.role_permissions enable row level security;

drop policy if exists "team reads role permissions" on public.role_permissions;
create policy "team reads role permissions" on public.role_permissions
  for select to authenticated
  using ((select public.app_role()) is not null);

drop policy if exists "user managers grant" on public.role_permissions;
create policy "user managers grant" on public.role_permissions
  for insert to authenticated
  with check ((select public.has_permission('users.manage')));

drop policy if exists "user managers revoke" on public.role_permissions;
create policy "user managers revoke" on public.role_permissions
  for delete to authenticated
  using ((select public.has_permission('users.manage')));

revoke all on public.role_permissions from anon;
revoke all on public.role_permissions from authenticated;
grant select, insert, delete on public.role_permissions to authenticated;


-- 5. Profiles: who may see everyone and hand out roles (was: managers, 0016).

drop policy if exists "read own or all as manager" on public.profiles;
drop policy if exists "read own or all as user manager" on public.profiles;
create policy "read own or all as user manager" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users.manage')));

drop policy if exists "managers set roles" on public.profiles;
drop policy if exists "user managers set roles" on public.profiles;
create policy "user managers set roles" on public.profiles
  for update to authenticated
  using ((select public.has_permission('users.manage')))
  with check ((select public.has_permission('users.manage')));


-- 6. The books. Reading stays open to the team (0016); writing asks the grid.
--
-- A transaction is entered under the permission for its kind, so income and
-- expenses can go to different people. Changing or removing one is its own
-- permission.

drop policy if exists "managers add transactions" on public.transactions;
drop policy if exists "managers change transactions" on public.transactions;
drop policy if exists "managers remove transactions" on public.transactions;
drop policy if exists "permitted add transactions" on public.transactions;
drop policy if exists "permitted change transactions" on public.transactions;
drop policy if exists "permitted remove transactions" on public.transactions;

create policy "permitted add transactions" on public.transactions
  for insert to authenticated
  with check (public.has_permission('transactions.' || kind::text));
create policy "permitted change transactions" on public.transactions
  for update to authenticated
  using ((select public.has_permission('transactions.edit')))
  with check (public.has_permission('transactions.' || kind::text)
              and (select public.has_permission('transactions.edit')));
create policy "permitted remove transactions" on public.transactions
  for delete to authenticated
  using ((select public.has_permission('transactions.edit')));

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['budgets', 'accounts', 'categories'] loop
    p := case t when 'budgets' then 'budgets.manage'
                when 'accounts' then 'accounts.manage'
                else 'categories.manage' end;

    execute format('drop policy if exists "managers add %1$s" on public.%1$I', t);
    execute format('drop policy if exists "managers change %1$s" on public.%1$I', t);
    execute format('drop policy if exists "managers remove %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted add %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted change %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted remove %1$s" on public.%1$I', t);

    execute format(
      'create policy "permitted add %1$s" on public.%1$I for insert to authenticated
         with check ((select public.has_permission(%2$L)))', t, p);
    execute format(
      'create policy "permitted change %1$s" on public.%1$I for update to authenticated
         using ((select public.has_permission(%2$L)))
         with check ((select public.has_permission(%2$L)))', t, p);
    execute format(
      'create policy "permitted remove %1$s" on public.%1$I for delete to authenticated
         using ((select public.has_permission(%2$L)))', t, p);
  end loop;
end
$$;
