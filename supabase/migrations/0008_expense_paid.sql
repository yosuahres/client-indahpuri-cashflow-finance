-- An expense can be recorded before the money leaves the account — a bill
-- entered when it arrives, settled later. `paid` carries that.
-- Run after 0007_drop_budget_distributions.sql. Safe to re-run.

alter table public.transactions
  add column if not exists paid boolean;

-- Everything already in the ledger predates the column. An expense was only
-- ever entered as money that had moved, so those are all paid.
update public.transactions
   set paid = true
 where kind = 'expense' and paid is null;

-- Income is recorded when it arrives, so the flag would mean nothing on it.
-- The constraint keeps the two in step: set on every expense, null on income.
alter table public.transactions
  drop constraint if exists transactions_paid_expense_only;

alter table public.transactions
  add constraint transactions_paid_expense_only check (
    (kind = 'expense' and paid is not null) or
    (kind <> 'expense' and paid is null)
  );
