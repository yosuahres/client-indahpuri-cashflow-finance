-- HRIS: leave types set up in the app instead of fixed in the schema.
--
-- 0027 gave leave five kinds as an enum. They become rows in a table the Leave
-- Types page adds to, and leave and budgets (0029) point at a row instead.
-- The five carry over under the same names, so nothing on file changes type.
--
-- A type anything is recorded against cannot be removed. Its budgets go with
-- it, since a budget for a type nobody can take any more means nothing.
--
-- Run after 0030_audit_log.sql. Safe to re-run.


-- 1. The types, seeded with the five 0027 had.

create table if not exists public.leave_types (
  id         uuid primary key default gen_random_uuid(),
  -- Who entered it, as on every other table.
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  constraint leave_types_name_length check (char_length(btrim(name)) between 1 and 60)
);

create unique index if not exists leave_types_name_unique on public.leave_types (lower(btrim(name)));

-- Seeded rows need someone to have entered them; the first manager will do.
insert into public.leave_types (user_id, name)
select u.id, t.name
from (values ('Annual'), ('Sick'), ('Unpaid'), ('Maternity'), ('Other')) as t (name)
cross join lateral (
  select p.id from public.profiles p where p.role = 'manager' order by p.created_at limit 1
) as u
on conflict do nothing;


-- 2. Leave and budgets point at a type row. The budget check reads the old
-- column, so it comes off first and goes back on in §4.

drop trigger if exists leave_requests_check_budget on public.leave_requests;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leave_requests' and column_name = 'leave_type'
  ) then
    alter table public.leave_requests
      add column if not exists leave_type_id uuid references public.leave_types (id) on delete restrict;
    update public.leave_requests r
    set leave_type_id = t.id
    from public.leave_types t
    where lower(t.name) = r.leave_type::text;
    alter table public.leave_requests alter column leave_type_id set not null;
    alter table public.leave_requests drop column leave_type;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leave_budgets' and column_name = 'leave_type'
  ) then
    alter table public.leave_budgets
      add column if not exists leave_type_id uuid references public.leave_types (id) on delete cascade;
    update public.leave_budgets b
    set leave_type_id = t.id
    from public.leave_types t
    where lower(t.name) = b.leave_type::text;
    alter table public.leave_budgets alter column leave_type_id set not null;
    alter table public.leave_budgets drop constraint if exists leave_budgets_one_per_year;
    alter table public.leave_budgets drop column leave_type;
  end if;
end $$;

drop type if exists public.leave_type;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leave_budgets_one_per_year' and conrelid = 'public.leave_budgets'::regclass
  ) then
    alter table public.leave_budgets
      add constraint leave_budgets_one_per_year unique (employee_id, leave_type_id, year);
  end if;
end $$;


-- 3. Same protections as the other HR tables (0021 §3, §5), and the leave tick
-- for every read and write (0027 §5).

drop trigger if exists leave_types_stamp_entered_by on public.leave_types;
create trigger leave_types_stamp_entered_by
  before insert or update on public.leave_types
  for each row execute function public.stamp_entered_by();

revoke all on public.leave_types from anon;
revoke truncate, references, trigger on public.leave_types from authenticated;

alter table public.leave_types enable row level security;

drop policy if exists "permitted read leave_types" on public.leave_types;
drop policy if exists "permitted add leave_types" on public.leave_types;
drop policy if exists "permitted change leave_types" on public.leave_types;
drop policy if exists "permitted remove leave_types" on public.leave_types;

create policy "permitted read leave_types" on public.leave_types
  for select to authenticated
  using ((select public.has_permission('leave.manage')));
create policy "permitted add leave_types" on public.leave_types
  for insert to authenticated
  with check ((select public.has_permission('leave.manage')));
create policy "permitted change leave_types" on public.leave_types
  for update to authenticated
  using ((select public.has_permission('leave.manage')))
  with check ((select public.has_permission('leave.manage')));
create policy "permitted remove leave_types" on public.leave_types
  for delete to authenticated
  using ((select public.has_permission('leave.manage')));

grant select, insert, update, delete on public.leave_types to authenticated;

-- Changes to either table land in the audit log (0030) like everything else.
do $$
declare
  t text;
begin
  if to_regprocedure('public.audit_row_change()') is null then
    return;
  end if;
  foreach t in array array['leave_types', 'leave_budgets'] loop
    execute format('drop trigger if exists %1$s_audit on public.%1$I', t);
    execute format(
      'create trigger %1$s_audit
         after insert or update or delete on public.%1$I
         for each row execute function public.audit_row_change(%2$L)', t, 'id');
  end loop;
end
$$;


-- 4. The budget check from 0029 §3, on the type row. Unchanged otherwise:
-- calendar days, split at New Year, pending holding its days, no budget no
-- limit.

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
  type_name text;
begin
  if new.status = 'rejected' then
    return new;
  end if;

  for y in extract(year from new.start_date)::integer .. extract(year from new.end_date)::integer loop
    select b.days into budget
    from public.leave_budgets b
    where b.employee_id = new.employee_id
      and b.leave_type_id = new.leave_type_id
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
      and r.leave_type_id = new.leave_type_id
      and r.status <> 'rejected'
      and r.id <> new.id
      and r.start_date <= last_day
      and r.end_date >= first_day;

    if used + wanted > budget then
      select name into type_name from public.leave_types where id = new.leave_type_id;
      raise exception 'Not enough % leave left for %: % of % days remain, and this takes %.',
        lower(type_name), y, trim_scale(greatest(budget - used, 0)), trim_scale(budget), wanted
        using errcode = 'LV001';
    end if;
  end loop;

  return new;
end
$$;

revoke execute on function public.check_leave_budget() from public, anon, authenticated;

create trigger leave_requests_check_budget
  before insert or update of status, start_date, end_date, leave_type_id, employee_id
  on public.leave_requests
  for each row execute function public.check_leave_budget();
