-- HRIS: attendance and leave, kept per employee.
--
-- Both are records over time rather than fields on the employee, so each gets
-- its own table pointing at the person. Removing an employee removes their
-- attendance and leave with them — the same cascade their photos follow (0019).
--
-- Reading either asks the grid (0024), under two new ticks: attendance and
-- leave are often somebody else's job than the employee record itself, so they
-- are separate from "Manage employees" rather than folded into it.
--
-- Run after 0026_delete_users.sql. Safe to re-run.


-- 1. Attendance: one row per employee per day.

do $$ begin
  create type public.attendance_status as enum
    ('present', 'late', 'absent', 'leave', 'holiday');
exception when duplicate_object then null; end $$;

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  -- Who entered it, as on every other table.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  on_date     date not null,
  status      public.attendance_status not null default 'present',
  -- Left empty on a day nobody was expected in. A check-out earlier than the
  -- check-in is a shift that ran past midnight, not a mistake: the resort
  -- works nights, so the two are never compared.
  check_in    time,
  check_out   time,
  note        text,
  created_at  timestamptz not null default now(),
  constraint attendance_one_per_day unique (employee_id, on_date),
  constraint attendance_note_length check (char_length(note) <= 200)
);

create index if not exists attendance_employee_date_idx
  on public.attendance (employee_id, on_date desc);


-- 2. Leave: a spell of days, and where it got to.

do $$ begin
  create type public.leave_type as enum
    ('annual', 'sick', 'unpaid', 'maternity', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type  public.leave_type not null default 'annual',
  start_date  date not null,
  end_date    date not null,
  status      public.leave_status not null default 'pending',
  reason      text,
  created_at  timestamptz not null default now(),
  constraint leave_dates_ordered check (end_date >= start_date),
  constraint leave_reason_length check (char_length(reason) <= 300)
);

create index if not exists leave_requests_employee_start_idx
  on public.leave_requests (employee_id, start_date desc);

-- Nobody is on two leaves at once. A rejected spell is not leave, so it is
-- left out and the same days can be asked for again.
create extension if not exists btree_gist;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leave_no_overlap' and conrelid = 'public.leave_requests'::regclass
  ) then
    alter table public.leave_requests
      add constraint leave_no_overlap
      exclude using gist (
        employee_id with =,
        daterange(start_date, end_date, '[]') with &&
      ) where (status <> 'rejected');
  end if;
end $$;


-- 3. The two new ticks, added to the grid's list (0024 §1) and handed to
-- managers. Other roles start without them, as a new permission always does.

alter table public.role_permissions drop constraint if exists role_permissions_known;
alter table public.role_permissions
  add constraint role_permissions_known check (permission in (
    'reports.view', 'profit_loss.view', 'budgets.view',
    'transactions.income', 'transactions.expense', 'transactions.edit',
    'budgets.manage', 'accounts.manage', 'categories.manage',
    'employees.manage', 'departments.manage',
    'attendance.manage', 'leave.manage',
    'users.manage'
  ));

insert into public.role_permissions (role, permission)
select 'manager', p.permission
from (values ('attendance.manage'), ('leave.manage')) as p (permission)
where exists (select 1 from public.roles where key = 'manager')
on conflict (role, permission) do nothing;


-- 4. "Who entered it" is always the person who entered it (0021 §3), signed-out
-- visitors get nothing, and nobody truncates (0021 §5).

do $$
declare
  t text;
begin
  foreach t in array array['attendance', 'leave_requests'] loop
    execute format('drop trigger if exists %1$s_stamp_entered_by on public.%1$I', t);
    execute format(
      'create trigger %1$s_stamp_entered_by
         before insert or update on public.%1$I
         for each row execute function public.stamp_entered_by()', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
  end loop;
end
$$;


-- 5. Both tables are HR records, so reading them asks the grid too — the same
-- shape the employee policies take (0024 §7).

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['attendance', 'leave_requests'] loop
    p := case t when 'attendance' then 'attendance.manage' else 'leave.manage' end;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "permitted read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted add %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted change %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted remove %1$s" on public.%1$I', t);

    execute format(
      'create policy "permitted read %1$s" on public.%1$I for select to authenticated
         using ((select public.has_permission(%2$L)))', t, p);
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

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;


-- 6. Taking attendance or deciding leave means knowing who the employees are,
-- so both ticks read the roll as well (was: employees.manage alone, 0024 §7).
-- Only reading: changing an employee record is still its own tick.

drop policy if exists "permitted read employees" on public.employees;
create policy "permitted read employees" on public.employees
  for select to authenticated
  using ((select public.has_permission('employees.manage'))
         or (select public.has_permission('attendance.manage'))
         or (select public.has_permission('leave.manage')));
