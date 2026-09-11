-- The Laporan Keuangan can be narrowed to one account.
--
-- Budgets name the account they are drawn on (0011), so the plan side of the
-- report can already be filtered. This puts the actual side on the same
-- footing: `account_name` null means every account, which is what every
-- existing caller gets.
--
-- Run after 0011_budget_account.sql. Safe to re-run.

-- The three-argument form is superseded. It has to go rather than sit beside
-- the new one: with a defaulted fourth parameter, a three-argument call would
-- match both and Postgres would refuse it as ambiguous.
drop function if exists public.report_monthly_totals(date, date, boolean);

create or replace function public.report_monthly_totals(
  from_date    date,
  to_date      date,
  paid_only    boolean default false,
  account_name text default null
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
    and (account_name is null or t.account = account_name)
  group by t.kind, t.category, to_char(t.occurred_on, 'YYYY-MM')
$$;

grant execute on function public.report_monthly_totals(date, date, boolean, text) to authenticated;

-- The account joins the covering index, so narrowing to one still never has to
-- visit the table.
drop index if exists public.transactions_report_idx;

create index if not exists transactions_report_idx
  on public.transactions (user_id, occurred_on)
  include (kind, category, amount, account, paid);
