-- Audit log: who changed what, when, as which role and from where.
--
-- Every insert, update and delete on the books, the HR records, leave, and the
-- team's users, roles and permissions writes one row here from a trigger, so
-- nothing the app or the API does can skip it. Sign-ins and sign-outs are
-- recorded by the app through `record_audit_event` (§5).
--
-- The log is append-only: nobody — managers included — can edit or delete a
-- row through the API. Reading it is its own tick, "View the audit log", which
-- only managers start with.
--
-- The IP address is the one the app forwards in `x-client-ip`
-- (src/lib/supabase/server.ts), falling back to `x-forwarded-for`. Someone
-- calling the API directly can send either header, so treat the IP as a lead,
-- not proof.
--
-- Run after 0029_leave_policies.sql. Safe to re-run.


-- 1. The log.

create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  -- Who did it. Empty when the database was changed from outside a signed-in
  -- session — the SQL editor, the service role, a cascade from auth.
  actor_id     uuid,
  -- Copied at the time, so the row still reads right after the person is
  -- renamed, re-roled or deleted.
  actor_email  text,
  actor_role   text,
  -- "transactions.update", "auth.sign_in".
  event        text not null,
  -- The table touched, or "auth" for a sign-in.
  resource     text not null,
  resource_id  text,
  -- create, update, delete, sign_in, sign_out.
  action       text not null,
  ip_address   text,
  -- For an update, only the fields that changed: {"amount": [100, 150]}.
  -- For a create or delete, the whole row.
  changes      jsonb
);

create index if not exists audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index if not exists audit_log_resource_idx on public.audit_log (resource, occurred_at desc);


-- 2. The new tick, known to the grid and given to managers.

alter table public.role_permissions drop constraint if exists role_permissions_known;
alter table public.role_permissions
  add constraint role_permissions_known check (permission in (
    'reports.view', 'profit_loss.view', 'budgets.view',
    'transactions.income', 'transactions.expense', 'transactions.edit',
    'budgets.manage', 'accounts.manage', 'categories.manage',
    'employees.manage', 'departments.manage',
    'attendance.manage', 'leave.manage',
    'users.manage', 'audit.view'
  ));

insert into public.role_permissions (role, permission)
select 'manager', 'audit.view'
where exists (select 1 from public.roles where key = 'manager')
on conflict (role, permission) do nothing;


-- 3. Who is asking, and from where. Security definer so it can read profiles
-- whatever the caller may see.

create or replace function public.audit_client_ip()
returns text
language sql
stable
as $$
  select nullif(btrim(coalesce(
    current_setting('request.headers', true)::json ->> 'x-client-ip',
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)
  )), '')
$$;

create or replace function public.write_audit_row(
  p_event text,
  p_resource text,
  p_resource_id text,
  p_action text,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_role  text;
begin
  if v_actor is not null then
    select email, role into v_email, v_role from public.profiles where id = v_actor;
  end if;

  insert into public.audit_log
    (actor_id, actor_email, actor_role, event, resource, resource_id, action, ip_address, changes)
  values
    (v_actor, v_email, v_role, p_event, p_resource, p_resource_id, p_action,
     public.audit_client_ip(), p_changes);
end
$$;

revoke execute on function public.audit_client_ip() from public, anon, authenticated;
revoke execute on function public.write_audit_row(text, text, text, text, jsonb)
  from public, anon, authenticated;


-- 4. The trigger. Its arguments name the columns that identify a row — "id"
-- on most tables, "key" on roles, "role,permission" on the grid.

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old     jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new     jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_action  text  := case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end;
  v_changes jsonb;
  v_id      text;
  v_key     text;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_array(v_old -> n.key, n.value))
      into v_changes
    from jsonb_each(v_new) n
    where n.value is distinct from v_old -> n.key;

    -- Saving a form unchanged is not a change.
    if v_changes is null then
      return new;
    end if;
  else
    v_changes := v_row;
  end if;

  select string_agg(v_row ->> btrim(k), ':')
    into v_id
  from unnest(string_to_array(coalesce(tg_argv[0], 'id'), ',')) as k;

  perform public.write_audit_row(
    tg_table_name || '.' || v_action, tg_table_name, v_id, v_action, v_changes
  );

  return coalesce(new, old);
end
$$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

do $$
declare
  t   record;
begin
  for t in
    select * from (values
      ('transactions', 'id'), ('budgets', 'id'), ('categories', 'id'), ('accounts', 'id'),
      ('employees', 'id'), ('departments', 'id'),
      ('attendance', 'id'), ('leave_requests', 'id'), ('shifts', 'id'),
      ('leave_types', 'id'), ('leave_periods', 'id'), ('leave_policies', 'id'),
      ('leave_policy_details', 'id'), ('leave_policy_assignments', 'id'),
      ('leave_allocations', 'id'),
      ('profiles', 'id'), ('roles', 'key'), ('role_permissions', 'role,permission')
    ) as v (name, id_columns)
  loop
    -- A table from a migration not run yet is skipped, not an error.
    continue when to_regclass(format('public.%I', t.name)) is null;

    execute format('drop trigger if exists %1$s_audit on public.%1$I', t.name);
    execute format(
      'create trigger %1$s_audit
         after insert or update or delete on public.%1$I
         for each row execute function public.audit_row_change(%2$L)', t.name, t.id_columns);
  end loop;
end
$$;


-- 5. Events the database cannot see for itself: signing in and out. Always
-- recorded against the caller, so nobody can log in someone else's name.

create or replace function public.record_audit_event(event_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if event_name not in ('auth.sign_in', 'auth.sign_out') then
    raise exception 'Unknown audit event %.', event_name using errcode = 'P0001';
  end if;

  perform public.write_audit_row(
    event_name, 'auth', auth.uid()::text, split_part(event_name, '.', 2), null
  );
end
$$;

revoke execute on function public.record_audit_event(text) from public, anon;
grant  execute on function public.record_audit_event(text) to authenticated;


-- 6. Reading. Nobody writes through the API; the triggers above are the only
-- way in, and nothing ever edits or removes a row.

alter table public.audit_log enable row level security;

drop policy if exists "permitted read audit log" on public.audit_log;
create policy "permitted read audit log" on public.audit_log
  for select to authenticated
  using ((select public.has_permission('audit.view')));

revoke all on public.audit_log from anon;
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;
