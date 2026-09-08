-- Cash flow app schema: transactions (money in/out) and budgets (the plan).
-- Run once against the project, e.g. in the Supabase SQL editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.cash_flow_section as enum ('operations', 'investing', 'financing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.budget_frequency as enum ('Monthly', 'Quarterly', 'Yearly');
exception when duplicate_object then null; end $$;


-- Actual money movements. These are what the Cash Flow report reads.
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurred_on  date not null,
  kind         public.transaction_kind not null,
  section      public.cash_flow_section not null,
  category     text not null,
  account      text not null,
  party        text,
  reference    text,
  -- Always positive; `kind` carries the direction so a sign error cannot flip it.
  amount       numeric(18, 2) not null check (amount > 0),
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc);


-- The plan a section or category is measured against.
create table if not exists public.budgets (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null,
  section            public.cash_flow_section not null,
  category           text,
  cost_center        text,
  fiscal_year_from   integer not null,
  fiscal_year_to     integer not null,
  frequency          public.budget_frequency not null,
  amount             numeric(18, 2) not null check (amount > 0),
  distribute_equally boolean not null default true,
  warn_on_overrun    boolean not null default true,
  created_at         timestamptz not null default now(),
  constraint budgets_year_order check (fiscal_year_to >= fiscal_year_from)
);

create index if not exists budgets_user_year_idx
  on public.budgets (user_id, fiscal_year_from);


-- One row per period of a budget. Generated when distributing equally.
create table if not exists public.budget_distributions (
  id         uuid primary key default gen_random_uuid(),
  budget_id  uuid not null references public.budgets (id) on delete cascade,
  starts_on  date not null,
  ends_on    date not null,
  amount     numeric(18, 2) not null,
  percent    numeric(6, 3) not null,
  position   integer not null
);

create index if not exists budget_distributions_budget_idx
  on public.budget_distributions (budget_id, position);


-- Row level security. The anon key is public, so every table needs this.
alter table public.transactions         enable row level security;
alter table public.budgets              enable row level security;
alter table public.budget_distributions enable row level security;

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Distribution rows inherit access from the budget that owns them.
drop policy if exists "own budget distributions" on public.budget_distributions;
create policy "own budget distributions" on public.budget_distributions
  for all to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_distributions.budget_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_distributions.budget_id and b.user_id = auth.uid()
    )
  );
