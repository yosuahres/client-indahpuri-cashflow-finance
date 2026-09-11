-- Remove the budget distribution rows.
--
-- A budget's amount is the total for its whole fiscal range, and the rows only
-- ever split it evenly. The report already levels that total across the range
-- when a budget has no rows, and that produces the same monthly figure the rows
-- did — a quarterly plan of 1200 stored as 4 rows of 300 over 3 months each is
-- 100 a month, exactly what 1200 over 12 months gives. So the table was a
-- second copy of something derivable, and nothing reads it any more.
--
-- Run after 0006_report_aggregates.sql. Safe to re-run.

drop table if exists public.budget_distributions;

-- `frequency` still describes the plan's cadence, but `distribute_equally` had
-- no meaning left once the rows went.
alter table public.budgets drop column if exists distribute_equally;
