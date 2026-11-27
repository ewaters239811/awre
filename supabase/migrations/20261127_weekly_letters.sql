create table if not exists public.weekly_letters (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_of date not null check (extract(isodow from week_of) = 1),
  subject text,
  paragraphs text[],
  delivered_at timestamptz,
  read_at timestamptz,
  claim_token uuid,
  claim_until timestamptz,
  primary key (user_id, week_of),
  check (
    (delivered_at is null and subject is null and paragraphs is null and read_at is null)
    or (delivered_at is not null and subject is not null and paragraphs is not null)
  )
);

create index if not exists weekly_letters_pending_idx
  on public.weekly_letters (week_of, user_id) where delivered_at is null;

alter table public.weekly_letters enable row level security;

revoke all on public.weekly_letters from public, anon, authenticated;
grant select (week_of, subject, paragraphs, delivered_at, read_at)
  on public.weekly_letters to authenticated;
grant update (read_at) on public.weekly_letters to authenticated;
grant select, insert, update, delete on public.weekly_letters to service_role;

drop policy if exists "Users can read own weekly letters" on public.weekly_letters;
create policy "Users can read own weekly letters" on public.weekly_letters
  for select to authenticated
  using ((select auth.uid()) = user_id and delivered_at is not null);

drop policy if exists "Users can mark own weekly letters read" on public.weekly_letters;
create policy "Users can mark own weekly letters read" on public.weekly_letters
  for update to authenticated
  using ((select auth.uid()) = user_id and delivered_at is not null)
  with check ((select auth.uid()) = user_id and delivered_at is not null);

create or replace function public.claim_weekly_letters(p_week_of date)
returns table (user_id uuid, claim_token uuid)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.weekly_letters as letters
  where letters.week_of < p_week_of and letters.delivered_at is null;

  insert into public.weekly_letters (user_id, week_of)
  select profiles.user_id, p_week_of
  from public.onboarding_profiles as profiles
  where length(btrim(profiles.data->>'primaryGoal')) > 0
    and coalesce(left(profiles.data->>'createdAt', 10), '') < to_char(p_week_of, 'YYYY-MM-DD')
    and not exists (
      select 1 from public.weekly_letters as letters
      where letters.user_id = profiles.user_id and letters.week_of = p_week_of
    )
  order by profiles.user_id
  on conflict on constraint weekly_letters_pkey do nothing;

  return query
  with available as (
    select letters.user_id
    from public.weekly_letters as letters
    where letters.week_of = p_week_of and letters.delivered_at is null
      and (letters.claim_until is null or letters.claim_until <= now())
    order by letters.claim_until nulls first, letters.user_id
    limit 12
    for update skip locked
  )
  update public.weekly_letters as letters
  set claim_token = gen_random_uuid(), claim_until = now() + interval '3 minutes'
  from available
  where letters.user_id = available.user_id and letters.week_of = p_week_of
  returning letters.user_id, letters.claim_token;
end;
$$;

revoke all on function public.claim_weekly_letters(date) from public, anon, authenticated;
grant execute on function public.claim_weekly_letters(date) to service_role;
