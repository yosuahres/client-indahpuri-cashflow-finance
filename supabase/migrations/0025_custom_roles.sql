-- Custom roles: roles are rows a user manager adds in Settings → Roles, not a
-- fixed list.
--
-- 0016 made the role an enum of manager and admin. An enum value can be added
-- but never removed, and adding one takes a schema change, so the role becomes
-- plain text naming a row in `roles`. What a role may do is still the grid in
-- `role_permissions` (0024); a new role starts with nothing ticked.
--
-- Manager is built in: it cannot be deleted, keeps user management (0024 §3),
-- and there is always at least one (0021 §2). A role someone still holds cannot
-- be deleted either — move them first.
--
-- Run after 0024_role_permissions.sql. Safe to re-run.


-- 1. The roles.

create table if not exists public.roles (
  key         text primary key,
  name        text not null,
  description text not null default '',
  -- Built-in roles are the ones the app itself relies on.
  built_in    boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint roles_key_format check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint roles_name_length check (char_length(btrim(name)) between 1 and 40),
  constraint roles_description_length check (char_length(description) <= 160)
);

create unique index if not exists roles_name_unique on public.roles (lower(btrim(name)));

insert into public.roles (key, name, description, built_in) values
  ('manager', 'Manager', 'Runs the books and the team', true),
  ('admin', 'Admin', 'Day-to-day finance work', false)
on conflict (key) do nothing;


-- 2. The role columns become text.
--
-- `app_role()` returns the enum, and the "team reads" policies call it, so it
-- goes first (taking those policies with it) and both come back in §3. The
-- last-manager trigger fires on updates of `role`, and a column a trigger names
-- cannot change type, so it steps aside too and comes back straight after.

do $$
begin
  if exists (
    select 1 from pg_type
    where typname = 'app_role' and typnamespace = 'public'::regnamespace
  ) then
    drop function if exists public.app_role() cascade;
    drop trigger if exists profiles_keep_one_manager on public.profiles;
    alter table public.profiles alter column role type text using role::text;
    alter table public.role_permissions alter column role type text using role::text;
    drop type public.app_role;
  end if;
end
$$;

drop trigger if exists profiles_keep_one_manager on public.profiles;
create trigger profiles_keep_one_manager
  before update of role on public.profiles
  for each row execute function public.keep_one_manager();


-- 3. The signed-in user's role, as text now, and the policies that read it.

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.app_role() from public, anon;
grant  execute on function public.app_role() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'budgets', 'categories', 'accounts'] loop
    execute format('drop policy if exists "team reads %1$s" on public.%1$I', t);
    execute format(
      'create policy "team reads %1$s" on public.%1$I for select to authenticated
         using ((select public.app_role()) is not null)', t);
  end loop;
end
$$;

drop policy if exists "team reads role permissions" on public.role_permissions;
create policy "team reads role permissions" on public.role_permissions
  for select to authenticated
  using ((select public.app_role()) is not null);


-- 4. A role names a real row. Renaming a key is not offered, but would carry
-- through; deleting a role takes its ticks with it and is refused while anyone
-- holds it.

alter table public.profiles drop constraint if exists profiles_role_fkey;
alter table public.profiles
  add constraint profiles_role_fkey
  foreign key (role) references public.roles (key) on update cascade on delete restrict;

alter table public.role_permissions drop constraint if exists role_permissions_role_fkey;
alter table public.role_permissions
  add constraint role_permissions_role_fkey
  foreign key (role) references public.roles (key) on update cascade on delete cascade;


-- 5. Sign-up no longer casts to the enum (was: 0021 §1).

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
    case when exists (select 1 from public.profiles) then null else 'manager' end
  )
  on conflict (id) do nothing;
  return new;
end
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- 6. Built-in roles stay.

create or replace function public.keep_built_in_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.built_in then
    raise exception 'The % role is built in and cannot be deleted.', old.name
      using errcode = 'P0001';
  end if;
  return old;
end
$$;

revoke execute on function public.keep_built_in_roles() from public, anon, authenticated;

drop trigger if exists roles_keep_built_in on public.roles;
create trigger roles_keep_built_in
  before delete on public.roles
  for each row execute function public.keep_built_in_roles();


-- 7. Anyone with a role reads the list; user managers add, rename and remove.
-- Only the name and description are editable, and nobody adds a built-in role.

alter table public.roles enable row level security;

drop policy if exists "team reads roles" on public.roles;
create policy "team reads roles" on public.roles
  for select to authenticated
  using ((select public.app_role()) is not null);

drop policy if exists "user managers add roles" on public.roles;
create policy "user managers add roles" on public.roles
  for insert to authenticated
  with check ((select public.has_permission('users.manage')) and not built_in);

drop policy if exists "user managers change roles" on public.roles;
create policy "user managers change roles" on public.roles
  for update to authenticated
  using ((select public.has_permission('users.manage')))
  with check ((select public.has_permission('users.manage')));

drop policy if exists "user managers remove roles" on public.roles;
create policy "user managers remove roles" on public.roles
  for delete to authenticated
  using ((select public.has_permission('users.manage')));

revoke all on public.roles from anon;
revoke all on public.roles from authenticated;
grant select, insert, delete on public.roles to authenticated;
grant update (name, description) on public.roles to authenticated;
