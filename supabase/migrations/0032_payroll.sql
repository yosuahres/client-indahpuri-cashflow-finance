-- HRIS: payroll — the monthly pay run, and a payslip per person in it.
--
-- The business pays on one formula (gaji bersih):
--
--   basic salary + fixed allowance + THR + service charge + meal allowance
--   + other allowances + bonus
--   − BPJS Ketenagakerjaan − BPJS Kesehatan − other deductions
--   = net pay
--
-- The meal allowance is days worked × a daily rate (Rp 4.000 to start), and
-- days worked come from attendance: a day marked present or late. A daily
-- worker's basic pay is their daily rate × those same days.
--
-- A payslip keeps its own copy of every figure and of who it was for, so a
-- run already paid reads the same after a raise, a new rate or the person
-- leaving. The app works the figures out; the database adds them up (§4), so
-- a net pay can never disagree with its own lines.
--
-- A final run is locked (§5): nothing on it changes until it is reopened.
--
-- Run after 0031_leave_types.sql. Safe to re-run.


-- 1. The rates, one row of them. BPJS rates are percentages of the wage the
-- contribution is taken from — basic salary plus fixed allowance — capped
-- where the law caps it. The defaults are the statutory ones; the JP cap moves
-- every March and is kept up to date in Payroll Settings.

create table if not exists public.payroll_settings (
  -- Always true: there is only ever the one row.
  id                     boolean primary key default true,
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_allowance_per_day bigint not null default 4000,
  bpjs_kes_employee_rate numeric(5, 2) not null default 1.00,
  bpjs_kes_employer_rate numeric(5, 2) not null default 4.00,
  bpjs_kes_wage_cap      bigint not null default 12000000,
  jht_employee_rate      numeric(5, 2) not null default 2.00,
  jht_employer_rate      numeric(5, 2) not null default 3.70,
  jp_employee_rate       numeric(5, 2) not null default 1.00,
  jp_employer_rate       numeric(5, 2) not null default 2.00,
  jp_wage_cap            bigint not null default 10547400,
  jkk_employer_rate      numeric(5, 2) not null default 0.24,
  jkm_employer_rate      numeric(5, 2) not null default 0.30,
  updated_at             timestamptz not null default now(),
  constraint payroll_settings_single check (id),
  constraint payroll_settings_amounts check (
    meal_allowance_per_day >= 0 and bpjs_kes_wage_cap >= 0 and jp_wage_cap >= 0
  ),
  constraint payroll_settings_rates check (
    bpjs_kes_employee_rate between 0 and 100 and bpjs_kes_employer_rate between 0 and 100
    and jht_employee_rate between 0 and 100 and jht_employer_rate between 0 and 100
    and jp_employee_rate between 0 and 100 and jp_employer_rate between 0 and 100
    and jkk_employer_rate between 0 and 100 and jkm_employer_rate between 0 and 100
  )
);

-- Seeded in the first manager's name, as there is no signed-in user here.
insert into public.payroll_settings (id, user_id)
select true, p.id
from public.profiles p
where p.role = 'manager'
order by p.created_at
limit 1
on conflict (id) do nothing;


-- 2. What a daily worker is paid for a day worked. Monthly staff leave it
-- empty and are paid their basic salary.

alter table public.employees
  add column if not exists daily_rate bigint check (daily_rate >= 0);


-- 3. The runs: one a month.

create table if not exists public.payroll_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The first of the month paid for.
  period       date not null,
  status       text not null default 'draft',
  finalized_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint payroll_runs_one_per_month unique (period),
  constraint payroll_runs_first_of_month check (extract(day from period) = 1),
  constraint payroll_runs_status_known check (status in ('draft', 'final'))
);


-- 4. The payslips. Every amount is whole rupiah.

create table if not exists public.payslips (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_id             uuid not null references public.payroll_runs (id) on delete cascade,
  -- Emptied if the employee record is ever deleted; the copy below keeps the
  -- payslip readable.
  employee_id        uuid references public.employees (id) on delete set null,
  employee_no        text not null,
  full_name          text not null,
  department         text,
  employment_type    text not null,

  working_days       integer not null default 0 check (working_days between 0 and 31),
  -- Set for a daily worker only: what a day was worth when this was paid.
  daily_rate         bigint check (daily_rate >= 0),

  -- Earnings
  basic_salary       bigint not null default 0 check (basic_salary >= 0),
  fixed_allowance    bigint not null default 0 check (fixed_allowance >= 0),
  thr                bigint not null default 0 check (thr >= 0),
  service_charge     bigint not null default 0 check (service_charge >= 0),
  meal_allowance     bigint not null default 0 check (meal_allowance >= 0),
  other_allowance    bigint not null default 0 check (other_allowance >= 0),
  bonus              bigint not null default 0 check (bonus >= 0),

  -- Deductions: the employee's share of BPJS, and anything else taken off.
  bpjs_kes_employee  bigint not null default 0 check (bpjs_kes_employee >= 0),
  jht_employee       bigint not null default 0 check (jht_employee >= 0),
  jp_employee        bigint not null default 0 check (jp_employee >= 0),
  other_deduction    bigint not null default 0 check (other_deduction >= 0),

  -- The company's share of BPJS: a cost to the business, not off the pay.
  bpjs_kes_employer  bigint not null default 0 check (bpjs_kes_employer >= 0),
  jht_employer       bigint not null default 0 check (jht_employer >= 0),
  jp_employer        bigint not null default 0 check (jp_employer >= 0),
  jkk_employer       bigint not null default 0 check (jkk_employer >= 0),
  jkm_employer       bigint not null default 0 check (jkm_employer >= 0),

  gross_pay bigint generated always as (
    basic_salary + fixed_allowance + thr + service_charge + meal_allowance
    + other_allowance + bonus
  ) stored,
  total_deductions bigint generated always as (
    bpjs_kes_employee + jht_employee + jp_employee + other_deduction
  ) stored,
  net_pay bigint generated always as (
    basic_salary + fixed_allowance + thr + service_charge + meal_allowance
    + other_allowance + bonus
    - bpjs_kes_employee - jht_employee - jp_employee - other_deduction
  ) stored,

  note       text,
  created_at timestamptz not null default now(),
  constraint payslips_one_per_run unique (run_id, employee_id),
  constraint payslips_note_length check (char_length(note) <= 200)
);

create index if not exists payslips_employee_idx on public.payslips (employee_id);


-- 5. A final run is locked: its payslips cannot be added, changed or removed,
-- and the run itself cannot be removed, until it is reopened as a draft.

create or replace function public.guard_final_payroll()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  run_status text;
begin
  if tg_table_name = 'payroll_runs' then
    if old.status = 'final' then
      raise exception 'This payroll is final. Reopen it before removing it.'
        using errcode = 'PY001';
    end if;
    return old;
  end if;

  select status into run_status
  from public.payroll_runs
  where id = coalesce(new.run_id, old.run_id);

  if run_status = 'final' then
    raise exception 'This payroll is final. Reopen it before changing a payslip.'
      using errcode = 'PY001';
  end if;

  return coalesce(new, old);
end
$$;

revoke execute on function public.guard_final_payroll() from public, anon, authenticated;

drop trigger if exists payslips_guard_final on public.payslips;
create trigger payslips_guard_final
  before insert or update or delete on public.payslips
  for each row execute function public.guard_final_payroll();

drop trigger if exists payroll_runs_guard_final on public.payroll_runs;
create trigger payroll_runs_guard_final
  before delete on public.payroll_runs
  for each row execute function public.guard_final_payroll();


-- 6. Days worked in a month, per person: a day marked present or late. Counted
-- here rather than in the app, as a month of attendance for the whole roll runs
-- past the rows one API read returns. Security invoker, so it only counts what
-- the caller may read.

create or replace function public.payroll_working_days(period date)
returns table (employee_id uuid, days integer)
language sql
stable
security invoker
set search_path = public
as $$
  select a.employee_id, count(*)::integer
  from public.attendance a
  where a.on_date >= date_trunc('month', period)::date
    and a.on_date < (date_trunc('month', period) + interval '1 month')::date
    and a.status in ('present', 'late')
  group by a.employee_id
$$;

revoke execute on function public.payroll_working_days(date) from public, anon;
grant execute on function public.payroll_working_days(date) to authenticated;

-- Each run's totals, for the Payroll dashboard's trend. Summed here for the
-- same reason: a year of payslips runs past one API read. Security invoker,
-- so the payroll tick's policies (§8) still decide who sees anything.

create or replace function public.payroll_run_totals(first_period date, last_period date)
returns table (
  period date,
  status text,
  people integer,
  gross_pay bigint,
  total_deductions bigint,
  net_pay bigint,
  employer_bpjs bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.period, r.status, count(s.id)::integer,
    coalesce(sum(s.gross_pay), 0)::bigint,
    coalesce(sum(s.total_deductions), 0)::bigint,
    coalesce(sum(s.net_pay), 0)::bigint,
    coalesce(sum(s.bpjs_kes_employer + s.jht_employer + s.jp_employer
                 + s.jkk_employer + s.jkm_employer), 0)::bigint
  from public.payroll_runs r
  left join public.payslips s on s.run_id = r.id
  where r.period between first_period and last_period
  group by r.id, r.period, r.status
  order by r.period
$$;

revoke execute on function public.payroll_run_totals(date, date) from public, anon;
grant execute on function public.payroll_run_totals(date, date) to authenticated;


-- 7. The new tick, known to the grid and handed to managers.

alter table public.role_permissions drop constraint if exists role_permissions_known;
alter table public.role_permissions
  add constraint role_permissions_known check (permission in (
    'reports.view', 'profit_loss.view', 'budgets.view',
    'transactions.income', 'transactions.expense', 'transactions.edit',
    'budgets.manage', 'accounts.manage', 'categories.manage',
    'employees.manage', 'departments.manage',
    'attendance.manage', 'leave.manage', 'payroll.manage',
    'users.manage', 'audit.view'
  ));

insert into public.role_permissions (role, permission)
select 'manager', 'payroll.manage'
where exists (select 1 from public.roles where key = 'manager')
on conflict (role, permission) do nothing;


-- 8. Same protections as the other HR tables (0021 §3, §5), the payroll tick
-- for every read and write, and every change in the audit log (0030).

do $$
declare
  t text;
begin
  foreach t in array array['payroll_settings', 'payroll_runs', 'payslips'] loop
    execute format('drop trigger if exists %1$s_stamp_entered_by on public.%1$I', t);
    execute format(
      'create trigger %1$s_stamp_entered_by
         before insert or update on public.%1$I
         for each row execute function public.stamp_entered_by()', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "permitted read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted add %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted change %1$s" on public.%1$I', t);
    execute format('drop policy if exists "permitted remove %1$s" on public.%1$I', t);

    execute format(
      'create policy "permitted read %1$s" on public.%1$I for select to authenticated
         using ((select public.has_permission(''payroll.manage'')))', t);
    execute format(
      'create policy "permitted add %1$s" on public.%1$I for insert to authenticated
         with check ((select public.has_permission(''payroll.manage'')))', t);
    execute format(
      'create policy "permitted change %1$s" on public.%1$I for update to authenticated
         using ((select public.has_permission(''payroll.manage'')))
         with check ((select public.has_permission(''payroll.manage'')))', t);
    execute format(
      'create policy "permitted remove %1$s" on public.%1$I for delete to authenticated
         using ((select public.has_permission(''payroll.manage'')))', t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    if to_regprocedure('public.audit_row_change()') is not null then
      execute format('drop trigger if exists %1$s_audit on public.%1$I', t);
      execute format(
        'create trigger %1$s_audit
           after insert or update or delete on public.%1$I
           for each row execute function public.audit_row_change(%2$L)', t, 'id');
    end if;
  end loop;
end
$$;


-- 9. Paying people means reading their pay off their record and their days
-- off attendance, so the payroll tick reads both (was: 0027 §5, §6). Only
-- reading: changing either is still its own tick.

drop policy if exists "permitted read employees" on public.employees;
create policy "permitted read employees" on public.employees
  for select to authenticated
  using ((select public.has_permission('employees.manage'))
         or (select public.has_permission('attendance.manage'))
         or (select public.has_permission('leave.manage'))
         or (select public.has_permission('payroll.manage')));

drop policy if exists "permitted read attendance" on public.attendance;
create policy "permitted read attendance" on public.attendance
  for select to authenticated
  using ((select public.has_permission('attendance.manage'))
         or (select public.has_permission('payroll.manage')));
