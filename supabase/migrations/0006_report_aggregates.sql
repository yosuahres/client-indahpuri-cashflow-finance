-- Two performance changes. Neither alters what the app is allowed to read.
-- Run after 0005_category_kind.sql. Safe to re-run.


-- 1. Row level security, evaluated once per query instead of once per row.
--
-- `auth.uid() = user_id` re-runs the function for every row Postgres examines,
-- because a bare function call in a policy is treated as row-dependent. Wrapped
-- in a scalar sub-select it becomes an InitPlan: evaluated once, then compared
-- as a constant, which also lets the planner use the user_id indexes below
-- rather than filtering after the fact. The rule enforced is identical.

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own accounts" on public.accounts;
create policy "own accounts" on public.accounts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own budget distributions" on public.budget_distributions;
create policy "own budget distributions" on public.budget_distributions
  for all to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_distributions.budget_id
        and b.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_distributions.budget_id
        and b.user_id = (select auth.uid())
    )
  );


-- 2. Aggregate the reports in the database.
--
-- Every report was reading each transaction row over the wire and summing them
-- in JavaScript — a year of entries fetched to draw a chart with twelve points.
-- Both reports group by the same three things, so one function serves both and
-- returns one row per category per month instead of one row per transaction.
--
-- `security invoker` (the default) is load-bearing: the function runs as the
-- caller, so the policy above still scopes it to that user's own rows.

create or replace function public.report_monthly_totals(
  from_date date,
  to_date   date
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
  group by t.kind, t.category, to_char(t.occurred_on, 'YYYY-MM')
$$;

grant execute on function public.report_monthly_totals(date, date) to authenticated;


-- Covers the grouped scan: the range is on occurred_on and every column the
-- aggregate touches is in the index, so it need not visit the table at all.
create index if not exists transactions_report_idx
  on public.transactions (user_id, occurred_on)
  include (kind, category, amount);
