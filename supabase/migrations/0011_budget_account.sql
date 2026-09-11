-- A budget plans one account's money, not the whole business's.
--
-- Which pot a plan is drawn on is the thing the finance team actually budgets
-- against: the operational bank account and the petty cash tin are planned
-- separately even when they spend on the same category.
--
-- Nullable on purpose. Rows entered before this column existed named no
-- account, and the only honest reading of those is "every account", so they
-- keep counting in the report exactly as they did. New plans always name one;
-- the form requires it.
--
-- Run after 0010_budget_period.sql. Safe to re-run.

alter table public.budgets
  add column if not exists account text;

-- The planner reads one account's year at a time, which is what the entry grid
-- loads and what the list filters to.
create index if not exists budgets_user_account_idx
  on public.budgets (user_id, period_year, account);

-- Note: like transactions, the account is stored by name rather than by id, so
-- renaming or removing an account never rewrites the plans filed against it.
