-- HRIS: the employee data sheet ("Data Karyawan") — its employment statuses,
-- departments and pay, and its choices for religion and family status.
--
-- Run after 0022_hris_security.sql. Safe to re-run.


-- 1. Employment status is Indonesian contract law's: PKWTT (permanent), PKWT
-- (fixed term), daily worker or consultant.
--
-- An enum value cannot be dropped, so the type is swapped for a new one.
-- Probation only exists under a PKWTT, and an intern is on a fixed term.

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'employment_type'
      and e.enumlabel = 'pkwtt'
  ) then
    alter type public.employment_type rename to employment_type_old;
    create type public.employment_type as enum ('pkwtt', 'pkwt', 'daily_worker', 'consultant');

    alter table public.employees alter column employment_type drop default;
    alter table public.employees
      alter column employment_type type public.employment_type
      using (case employment_type::text
        when 'permanent' then 'pkwtt'
        when 'probation' then 'pkwtt'
        when 'contract'  then 'pkwt'
        when 'intern'    then 'pkwt'
      end)::public.employment_type;
    alter table public.employees alter column employment_type set default 'pkwtt';

    drop type public.employment_type_old;
  end if;
end
$$;


-- 2. Monthly pay, beside the yearly CTC from 0018.

alter table public.employees
  add column if not exists basic_salary    bigint check (basic_salary >= 0),
  add column if not exists fixed_allowance bigint check (fixed_allowance >= 0);


-- 3. The departments on the sheet, ready to pick. Entered in the name of the
-- first manager, as there is no signed-in user here.

insert into public.departments (user_id, name)
select m.id, d.name
from (values
  ('Management'), ('Finance'), ('Security'), ('Golf Operation'),
  ('Front Office'), ('F&B'), ('M&E'), ('GCM')
) as d (name)
cross join (
  select id from public.profiles where role = 'manager' order by created_at limit 1
) as m
on conflict (name) do nothing;


-- 4. Religion is one of the six the state recognises: Islam, Christian,
-- Catholic, Hindu, Buddhist or Konghucu. A value outside the list would stop
-- the record from saving, so it is cleared.

update public.employees set religion = 'Christian' where religion = 'Protestant';
update public.employees set religion = null
where religion not in
  ('Islam', 'Christian', 'Catholic', 'Hindu', 'Buddhist', 'Konghucu');
