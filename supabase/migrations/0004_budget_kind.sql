-- Budgets planned money without saying which direction it moved, so the
-- financial report had no way to split them into income and expense.
-- Run after 0003_accounts.sql. Safe to re-run.

-- Existing rows land on 'expense': budgets are overwhelmingly spending plans,
-- and an income plan is easy to spot and correct. Review them after running.
alter table public.budgets
  add column if not exists kind public.transaction_kind not null default 'expense';

create index if not exists budgets_user_kind_idx
  on public.budgets (user_id, kind);
