-- HRIS: a leave budget per person — so many days of a type in a year — and
-- leave that draws it down.
--
-- The budget is typed in per employee on the Leave Budgets page. What is left
-- is never stored: it is the budget less the leave taken that year, worked out
-- when asked, so approving, rejecting or removing a spell moves it with nothing
-- to keep in step.
--
-- A type with no budget for someone that year is not limited. One with a budget
-- cannot be overdrawn: recording or approving a spell checks it first (§3).
--
-- Run after 0028_shifts.sql. Safe to re-run.


-- 0. An earlier draft of this migration set leave up the way Frappe HR does,
-- with types, periods, policies and allocations. Where it was run, put leave
-- back on the fixed types and take those tables away.
--
-- Keyed on a table only that draft had, so re-running this after 0031 (which
-- brings a leave_types table of its own) leaves that one alone. What reads the
-- old type column goes first, or the column cannot be dropped.

drop trigger if exists leave_requests_check on public.leave_requests;
drop function if exists public.check_leave_request();
drop function if exists public.assign_leave_policy(uuid[], uuid, text, uuid, date, date, boolean);
drop function if exists public.leave_carry_forward(uuid, uuid, date);
drop view if exists public.leave_allocation_usage;

do $$ begin
  if to_regclass('public.leave_policies') is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leave_requests' and column_name = 'leave_type_id'
  ) then
    if to_regtype('public.leave_type') is null then
      create type public.leave_type as enum ('annual', 'sick', 'unpaid', 'maternity', 'other');
    end if;

    alter table public.leave_requests add column if not exists leave_type public.leave_type;
    update public.leave_requests r
    set leave_type = case lower(t.name)
      when 'annual leave'    then 'annual'
      when 'sick leave'      then 'sick'
      when 'unpaid leave'    then 'unpaid'
      when 'maternity leave' then 'maternity'
      else 'other'
    end::public.leave_type
    from public.leave_types t
    where t.id = r.leave_type_id;
    alter table public.leave_requests alter column leave_type set default 'annual';
    alter table public.leave_requests alter column leave_type set not null;

    alter table public.leave_requests drop column leave_type_id;
  end if;

  if to_regclass('public.leave_policies') is not null then
    drop table if exists public.leave_allocations;
    drop table if exists public.leave_policy_assignments;
    drop table if exists public.leave_policy_details;
    drop table public.leave_policies;
    drop table if exists public.leave_periods;
    drop table if exists public.leave_types;
  end if;
end $$;


-- 1. The budgets.

create table if not exists public.leave_budgets (
  id          uuid primary key default gen_random_uuid(),
  -- Who entered it, as on every other table.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type  public.leave_type not null default 'annual',
  year        integer not null,
  -- Half days allowed, for someone who joins partway through the year.
  days        numeric(5, 1) not null,
  created_at  timestamptz not null default now(),
  constraint leave_budgets_one_per_year unique (employee_id, leave_type, year),
  constraint leave_budgets_days_range check (days >= 0 and days <= 366),
  constraint leave_budgets_year_range check (year between 2000 and 2100)
);


-- 2. Same protections as the other HR tables (0021 §3, §5), and the leave tick
-- for every read and write (0027 §5).

drop trigger if exists leave_budgets_stamp_entered_by on public.leave_budgets;
create trigger leave_budgets_stamp_entered_by
  before insert or update on public.leave_budgets
  for each row execute function public.stamp_entered_by();

revoke all on public.leave_budgets from anon;
revoke truncate, references, trigger on public.leave_budgets from authenticated;

alter table public.leave_budgets enable row level security;

drop policy if exists "permitted read leave_budgets" on public.leave_budgets;
drop policy if exists "permitted add leave_budgets" on public.leave_budgets;
drop policy if exists "permitted change leave_budgets" on public.leave_budgets;
drop policy if exists "permitted remove leave_budgets" on public.leave_budgets;

create policy "permitted read leave_budgets" on public.leave_budgets
  for select to authenticated
  using ((select public.has_permission('leave.manage')));
create policy "permitted add leave_budgets" on public.leave_budgets
  for insert to authenticated
  with check ((select public.has_permission('leave.manage')));
create policy "permitted change leave_budgets" on public.leave_budgets
  for update to authenticated
  using ((select public.has_permission('leave.manage')))
  with check ((select public.has_permission('leave.manage')));
create policy "permitted remove leave_budgets" on public.leave_budgets
  for delete to authenticated
  using ((select public.has_permission('leave.manage')));

grant select, insert, update, delete on public.leave_budgets to authenticated;


-- 3. Leave has to fit the budget before it is on the record.
--
-- Calendar days, both ends included, as the app counts them. A spell running
-- over New Year is split, and each part is checked against its own year.
-- Pending spells hold their days alongside approved ones, so two requests
-- cannot each spend the same days; a rejected spell is not leave and is
-- neither checked nor counted.

create or replace function public.check_leave_budget()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  y         integer;
  first_day date;
  last_day  date;
  wanted    integer;
  budget    numeric;
  used      numeric;
begin
  if new.status = 'rejected' then
    return new;
  end if;

  for y in extract(year from new.start_date)::integer .. extract(year from new.end_date)::integer loop
    select b.days into budget
    from public.leave_budgets b
    where b.employee_id = new.employee_id
      and b.leave_type = new.leave_type
      and b.year = y;

    -- No budget that year: not limited.
    continue when budget is null;

    first_day := make_date(y, 1, 1);
    last_day := make_date(y, 12, 31);
    wanted := least(new.end_date, last_day) - greatest(new.start_date, first_day) + 1;

    select coalesce(sum(least(r.end_date, last_day) - greatest(r.start_date, first_day) + 1), 0)
    into used
    from public.leave_requests r
    where r.employee_id = new.employee_id
      and r.leave_type = new.leave_type
      and r.status <> 'rejected'
      and r.id <> new.id
      and r.start_date <= last_day
      and r.end_date >= first_day;

    if used + wanted > budget then
      raise exception 'Not enough % leave left for %: % of % days remain, and this takes %.',
        new.leave_type, y, trim_scale(greatest(budget - used, 0)), trim_scale(budget), wanted
        using errcode = 'LV001';
    end if;
  end loop;

  return new;
end
$$;

revoke execute on function public.check_leave_budget() from public, anon, authenticated;

drop trigger if exists leave_requests_check_budget on public.leave_requests;
create trigger leave_requests_check_budget
  before insert or update of status, start_date, end_date, leave_type, employee_id
  on public.leave_requests
  for each row execute function public.check_leave_budget();
