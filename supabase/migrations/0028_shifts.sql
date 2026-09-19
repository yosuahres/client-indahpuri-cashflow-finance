-- HRIS: shifts — when a person is due in and due out.
--
-- Attendance records what happened; a shift records what was meant to happen.
-- Without one, "late" is only ever a status somebody ticked by hand, and an
-- early exit cannot be worked out at all. With one, both follow from the
-- clock times.
--
-- A shift is set up once under Shift & Attendance and then picked on the
-- employee, which is what decides their clock-in and clock-out.
--
-- Run after 0027_attendance_and_leave.sql. Safe to re-run.


-- 1. The shifts.
--
-- `ends_at` earlier than `starts_at` is a night shift running past midnight —
-- the resort works them, so the two are deliberately not compared.

create table if not exists public.shifts (
  id         uuid primary key default gen_random_uuid(),
  -- Who entered it, as on every other table.
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  starts_at  time not null,
  ends_at    time not null,
  -- Marks the shift on a roster at a glance. One of a fixed set, so the app
  -- draws it from its own palette rather than storing arbitrary CSS.
  color      text not null default 'blue',
  created_at timestamptz not null default now(),
  constraint shifts_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint shifts_color_known check (color in
    ('blue', 'green', 'amber', 'rose', 'violet', 'cyan', 'orange', 'slate'))
);

create unique index if not exists shifts_name_unique on public.shifts (lower(btrim(name)));


-- 2. Which shift an employee is on. Emptied rather than blocking if the shift
-- is retired — the person stays, their hours are simply no longer set.

alter table public.employees
  add column if not exists shift_id uuid references public.shifts (id) on delete set null;

create index if not exists employees_shift_idx on public.employees (shift_id);


-- 3. Same protections the other HR tables carry (0021 §3, §5).

drop trigger if exists shifts_stamp_entered_by on public.shifts;
create trigger shifts_stamp_entered_by
  before insert or update on public.shifts
  for each row execute function public.stamp_entered_by();

revoke all on public.shifts from anon;
revoke truncate, references, trigger on public.shifts from authenticated;


-- 4. Shifts are set up in the Shift & Attendance area, so they ride on the
-- attendance tick. The employee form picks one, so managing employees reads
-- them as well — the same shape departments take (0024 §7).

alter table public.shifts enable row level security;

drop policy if exists "permitted read shifts" on public.shifts;
create policy "permitted read shifts" on public.shifts
  for select to authenticated
  using ((select public.has_permission('attendance.manage'))
         or (select public.has_permission('employees.manage')));

drop policy if exists "permitted add shifts" on public.shifts;
create policy "permitted add shifts" on public.shifts
  for insert to authenticated
  with check ((select public.has_permission('attendance.manage')));

drop policy if exists "permitted change shifts" on public.shifts;
create policy "permitted change shifts" on public.shifts
  for update to authenticated
  using ((select public.has_permission('attendance.manage')))
  with check ((select public.has_permission('attendance.manage')));

drop policy if exists "permitted remove shifts" on public.shifts;
create policy "permitted remove shifts" on public.shifts
  for delete to authenticated
  using ((select public.has_permission('attendance.manage')));

grant select, insert, update, delete on public.shifts to authenticated;
