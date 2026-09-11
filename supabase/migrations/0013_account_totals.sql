-- Actuals grouped by the account they moved through.
--
-- `report_monthly_totals` groups by category, which is what the statements
-- read. The dashboard asks a different question — how is each account tracking
-- against its plan — and answering it from the category aggregate is not
-- possible, so this is a second grouping rather than a wider one.
--
-- Run after 0012_report_account_filter.sql. Safe to re-run.

create or replace function public.report_account_totals(
  from_date date,
  to_date   date,
  paid_only boolean default false
)
returns table (
  kind    public.transaction_kind,
  account text,
  month   text,
  total   numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.kind,
    t.account,
    to_char(t.occurred_on, 'YYYY-MM') as month,
    sum(t.amount)                     as total
  from public.transactions t
  where t.occurred_on >= from_date
    and t.occurred_on <= to_date
    -- Income carries no flag at all, so it is never the one excluded.
    and (not paid_only or coalesce(t.paid, true))
  group by t.kind, t.account, to_char(t.occurred_on, 'YYYY-MM')
$$;

grant execute on function public.report_account_totals(date, date, boolean) to authenticated;

-- 0012 already added `account` to the covering index, so this grouping is
-- served by the same index scan and needs no second one.
