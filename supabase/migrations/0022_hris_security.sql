-- HRIS security hardening: the same protections 0021 gives the books, for the
-- HR tables and the employee photo bucket.
--
-- Run after 0020_departments.sql and 0021_security_hardening.sql. Safe to re-run.


-- 1. "Who entered it" is always the person who entered it (see 0021 §3).

do $$
declare
  t text;
begin
  foreach t in array array['employees', 'departments'] loop
    execute format('drop trigger if exists %1$s_stamp_entered_by on public.%1$I', t);
    execute format(
      'create trigger %1$s_stamp_entered_by
         before insert or update on public.%1$I
         for each row execute function public.stamp_entered_by()', t);
  end loop;
end
$$;


-- 2. Signed-out visitors get nothing, and nobody truncates (see 0021 §5).

do $$
declare
  t text;
begin
  foreach t in array array['employees', 'departments'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
  end loop;
end
$$;


-- 3. Employee photos only go into the folder of an employee that exists.
--
-- The app already checks this before pointing a record at a photo, but the
-- upload itself goes straight from the browser to storage.

drop policy if exists "managers add employee photos" on storage.objects;
create policy "managers add employee photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'employee-photos'
    and (select public.app_role()) = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "managers change employee photos" on storage.objects;
create policy "managers change employee photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'employee-photos' and (select public.app_role()) = 'manager')
  with check (
    bucket_id = 'employee-photos'
    and (select public.app_role()) = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id::text = (storage.foldername(name))[1]
    )
  );
