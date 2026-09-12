-- Income now carries the same settlement flag as expense. Existing income
-- rows were historically treated as received, so preserve that behavior.
-- Run after 0013_account_totals.sql. Safe to re-run.

alter table public.transactions
  drop constraint if exists transactions_paid_expense_only;

update public.transactions
   set paid = true
 where kind = 'income' and paid is null;

alter table public.transactions
  alter column paid set default true;

update public.transactions
   set paid = true
 where paid is null;

alter table public.transactions
  alter column paid set not null;