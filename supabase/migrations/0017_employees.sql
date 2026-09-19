-- HRIS: the people who work for the business.
--
-- Personal details are not for the whole team, so unlike the books (0016)
-- only managers read this table, not just write it.
--
-- Run after 0016_roles.sql. Safe to re-run.

do $$ begin
  create type public.employment_type as enum
    ('permanent', 'contract', 'probation', 'intern');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.employee_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  -- Who entered it, as on every other table.
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  employee_no     text not null,
  full_name       text not null,
  email           text,
  phone           text,
  position        text,
  department      text,
  employment_type public.employment_type not null default 'permanent',
  join_date       date,
  status          public.employee_status not null default 'active',
  created_at      timestamptz not null default now(),
  constraint employees_unique_no unique (employee_no)
);

create index if not exists employees_full_name_idx on public.employees (full_name);

alter table public.employees enable row level security;

drop policy if exists "managers read employees" on public.employees;
create policy "managers read employees" on public.employees
  for select to authenticated
  using ((select public.app_role()) = 'manager');

drop policy if exists "managers add employees" on public.employees;
create policy "managers add employees" on public.employees
  for insert to authenticated
  with check ((select public.app_role()) = 'manager');

drop policy if exists "managers change employees" on public.employees;
create policy "managers change employees" on public.employees
  for update to authenticated
  using ((select public.app_role()) = 'manager')
  with check ((select public.app_role()) = 'manager');

drop policy if exists "managers remove employees" on public.employees;
create policy "managers remove employees" on public.employees
  for delete to authenticated
  using ((select public.app_role()) = 'manager');
