-- Laporan Keuangan reports cash that actually moved, so an expense still
-- sitting unpaid is not an actual yet.
--
-- The other reports want the whole picture, and the ledger has to keep showing
-- unpaid rows or there would be nothing to settle, so this is a parameter
-- rather than a rule baked into the aggregate.
--
-- Run after 0008_expense_paid.sql. Safe to re-run.

-- The old two-argument form is superseded; `paid_only` defaults to the same
-- behaviour, so callers that do not pass it are unaffected.
drop function if exists public.report_monthly_totals(date, date);

create or replace function public.report_monthly_totals(
  from_date date,
  to_date   date,
  paid_only boolean default false
)
returns table (
  kind     public.transaction_kind,
  category text,
  month    text,
  total    numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.kind,
    t.category,
    to_char(t.occurred_on, 'YYYY-MM') as month,
    sum(t.amount)                     as total
  from public.transactions t
  where t.occurred_on >= from_date
    and t.occurred_on <= to_date
    -- Income carries no flag at all, so it is never the one excluded.
    and (not paid_only or coalesce(t.paid, true))
  group by t.kind, t.category, to_char(t.occurred_on, 'YYYY-MM')
$$;

grant execute on function public.report_monthly_totals(date, date, boolean) to authenticated;
