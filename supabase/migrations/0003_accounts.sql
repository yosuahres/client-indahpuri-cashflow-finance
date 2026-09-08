-- Cash, bank, wallet and card accounts money moves through.
-- Run after 0002_categories.sql. Safe to re-run.

do $$ begin
  create type public.account_type as enum
    ('bank', 'cash', 'e_wallet', 'credit_card', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.accounts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null,
  type               public.account_type not null default 'bank',
  -- Only some of these apply per type; the form asks for the relevant ones.
  provider           text,  -- bank / card issuer / wallet provider
  account_no         text,  -- account number / card number / wallet id
  holder             text,  -- who holds the cash
  notes              text,  -- free text for 'other'
  is_company_account boolean not null default true,
  created_at         timestamptz not null default now(),
  constraint accounts_unique_name unique (user_id, name)
);

-- Bring an already-created table up to date.
alter table public.accounts add column if not exists type public.account_type not null default 'bank';
alter table public.accounts add column if not exists provider text;
alter table public.accounts add column if not exists holder text;
alter table public.accounts add column if not exists notes text;
-- Replaced by the `type` column.
alter table public.accounts drop column if exists is_credit_card;
alter table public.accounts drop column if exists bank;

create index if not exists accounts_user_name_idx on public.accounts (user_id, name);

alter table public.accounts enable row level security;

drop policy if exists "own accounts" on public.accounts;
create policy "own accounts" on public.accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: transactions store the account as text, so renaming or removing an
-- account here never rewrites history.
