-- Categories are user-managed from the transaction form, so they live in a
-- table rather than in code. Run after 0001_cash_flow.sql.

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  section    public.cash_flow_section not null,
  created_at timestamptz not null default now(),
  -- The same name may exist in two sections, but not twice in one.
  constraint categories_unique_per_section unique (user_id, section, name)
);

create index if not exists categories_user_section_idx
  on public.categories (user_id, section, name);

alter table public.categories enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: transactions store the category as text, so deleting a category here
-- never rewrites history — past entries keep the name they were filed under.
