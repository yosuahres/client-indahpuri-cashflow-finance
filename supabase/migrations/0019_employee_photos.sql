-- HRIS: a photo per employee, shown on their details page.
--
-- Photos sit in a private bucket under `<employee id>/`, readable and
-- writable by managers only — the same people who can open the employee.
--
-- Run after 0018_employee_details.sql. Safe to re-run.

alter table public.employees add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-photos', 'employee-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "managers read employee photos" on storage.objects;
create policy "managers read employee photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'employee-photos' and (select public.app_role()) = 'manager');

drop policy if exists "managers add employee photos" on storage.objects;
create policy "managers add employee photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'employee-photos' and (select public.app_role()) = 'manager');

drop policy if exists "managers change employee photos" on storage.objects;
create policy "managers change employee photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'employee-photos' and (select public.app_role()) = 'manager')
  with check (bucket_id = 'employee-photos' and (select public.app_role()) = 'manager');

drop policy if exists "managers remove employee photos" on storage.objects;
create policy "managers remove employee photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'employee-photos' and (select public.app_role()) = 'manager');
