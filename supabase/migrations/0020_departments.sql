-- HRIS setup: the departments an employee can be filed under.
--
-- Employees keep the department by name, as transactions keep their account,
-- so removing a department never rewrites anyone's record.
--
-- Run after 0019_employee_photos.sql. Safe to re-run.

create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  -- Who entered it, as on every other table.
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  constraint departments_unique_name unique (name)
);

alter table public.departments enable row level security;

drop policy if exists "managers read departments" on public.departments;
create policy "managers read departments" on public.departments
  for select to authenticated
  using ((select public.app_role()) = 'manager');

drop policy if exists "managers add departments" on public.departments;
create policy "managers add departments" on public.departments
  for insert to authenticated
  with check ((select public.app_role()) = 'manager');

drop policy if exists "managers change departments" on public.departments;
create policy "managers change departments" on public.departments
  for update to authenticated
  using ((select public.app_role()) = 'manager')
  with check ((select public.app_role()) = 'manager');

drop policy if exists "managers remove departments" on public.departments;
create policy "managers remove departments" on public.departments
  for delete to authenticated
  using ((select public.app_role()) = 'manager');

-- Anything already typed on an employee becomes a department to pick from.
insert into public.departments (user_id, name)
select distinct on (department) user_id, department
from public.employees
where department is not null and department <> ''
on conflict (name) do nothing;
