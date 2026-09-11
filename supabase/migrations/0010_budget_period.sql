-- A budget plans one period, not a span of fiscal years.
--
-- The old shape stored a range (`fiscal_year_from` .. `fiscal_year_to`) and a
-- `frequency` that described nothing the report could act on: the amount was
-- levelled across every month in the range whatever the frequency said. So a
-- plan for one month could not be entered at all — it had to be written as a
-- year and divided by twelve.
--
-- Now a budget names the period it is for: `period_month` set means the whole
-- amount falls in that one month, `period_month` null means the amount is a
-- yearly plan levelled across the twelve months of `period_year`. Nothing else
-- is needed to tell the two apart, so there is no separate period-type column
-- to drift out of step with this one.
--
-- Run after 0009_paid_only_totals.sql. Safe to re-run.

alter table public.budgets
  add column if not exists period_year  integer,
  add column if not exists period_month integer;

-- Existing rows carry a year range. A range is not a period, so each one lands
-- on its first year as a yearly plan; a budget that really spanned several
-- years now plans only the first of them. Review those after running.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budgets'
      and column_name = 'fiscal_year_from'
  ) then
    execute 'update public.budgets
                set period_year = fiscal_year_from
              where period_year is null';
  end if;
end $$;

-- Anything still unfilled predates nothing at all — fall back to the year it
-- was entered, which is the year its author had in mind.
update public.budgets
   set period_year = extract(year from created_at)::integer
 where period_year is null;

alter table public.budgets
  alter column period_year set not null;

alter table public.budgets
  drop constraint if exists budgets_period_month_range;

alter table public.budgets
  add constraint budgets_period_month_range check (
    period_month is null or period_month between 1 and 12
  );

-- The report asks for one year at a time and reads the month off the row.
drop index if exists public.budgets_user_year_idx;

create index if not exists budgets_user_period_idx
  on public.budgets (user_id, period_year, period_month);

alter table public.budgets drop constraint if exists budgets_year_order;

alter table public.budgets
  drop column if exists fiscal_year_from,
  drop column if exists fiscal_year_to,
  drop column if exists frequency;

-- `frequency` was the only thing that used it.
drop type if exists public.budget_frequency;
