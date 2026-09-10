-- Categories now belong to one direction. A category filed under income is
-- never offered on an expense entry, so the dropdown only ever shows the few
-- names that can apply. Run after 0004_budget_kind.sql. Safe to re-run.

alter table public.categories
  add column if not exists kind public.transaction_kind not null default 'expense';

-- The list predates the split, so it has to be sorted out once by name. These
-- four are how money comes in; everything already recorded is money going out
-- and keeps the column default.
update public.categories
   set kind = 'income'
 where lower(name) in ('cash', 'credit card', 'qris', 'transfer in');

-- The same name may now exist once per direction — "Cash" is both a way money
-- arrives and a way it leaves — so the direction joins the unique key.
alter table public.categories
  drop constraint if exists categories_unique_per_section;

do $$ begin
  alter table public.categories
    add constraint categories_unique_per_kind_section
    unique (user_id, kind, section, name);
exception when duplicate_object then null; end $$;

-- Superseded by the kind-aware index: the dropdown always filters on both.
drop index if exists public.categories_user_section_idx;

create index if not exists categories_user_kind_section_idx
  on public.categories (user_id, kind, section, name);
