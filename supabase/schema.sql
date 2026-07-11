create table if not exists public.check_ins (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  data jsonb not null
);

create index if not exists check_ins_user_created_at_idx
  on public.check_ins (user_id, created_at desc);

alter table public.check_ins enable row level security;

drop policy if exists "Users can read own check-ins" on public.check_ins;
create policy "Users can read own check-ins"
  on public.check_ins for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own check-ins" on public.check_ins;
create policy "Users can insert own check-ins"
  on public.check_ins for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own check-ins" on public.check_ins;
create policy "Users can update own check-ins"
  on public.check_ins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own check-ins" on public.check_ins;
create policy "Users can delete own check-ins"
  on public.check_ins for delete
  using (auth.uid() = user_id);

create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, date desc);

alter table public.journal_entries enable row level security;

drop policy if exists "Users can read own journal entries" on public.journal_entries;
create policy "Users can read own journal entries"
  on public.journal_entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own journal entries" on public.journal_entries;
create policy "Users can insert own journal entries"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own journal entries" on public.journal_entries;
create policy "Users can update own journal entries"
  on public.journal_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own journal entries" on public.journal_entries;
create policy "Users can delete own journal entries"
  on public.journal_entries for delete
  using (auth.uid() = user_id);

create table if not exists public.onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null,
  data jsonb not null
);

alter table public.onboarding_profiles enable row level security;

drop policy if exists "Users can read own onboarding profile" on public.onboarding_profiles;
create policy "Users can read own onboarding profile"
  on public.onboarding_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own onboarding profile" on public.onboarding_profiles;
create policy "Users can insert own onboarding profile"
  on public.onboarding_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own onboarding profile" on public.onboarding_profiles;
create policy "Users can update own onboarding profile"
  on public.onboarding_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
