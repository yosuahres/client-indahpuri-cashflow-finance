-- Allow Laporan Keuangan to filter income and expense settlement separately.
-- Run after 0014_income_paid.sql. Safe to re-run.

drop function if exists public.report_monthly_totals(date, date, boolean, text);

create or replace function public.report_monthly_totals(
  from_date    date,
  to_date      date,
  paid_only    boolean default false,
  account_name text default null,
  income_paid  boolean default null,
  expense_paid boolean default null
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
    and (not paid_only or t.paid)
    and (income_paid is null or t.kind <> 'income' or t.paid = income_paid)
    and (expense_paid is null or t.kind <> 'expense' or t.paid = expense_paid)
    and (account_name is null or t.account = account_name)
  group by t.kind, t.category, to_char(t.occurred_on, 'YYYY-MM')
$$;

grant execute on function public.report_monthly_totals(date, date, boolean, text, boolean, boolean) to authenticated;