-- Additive, rerunnable migration. Existing rows remain valid and unchanged.
-- Goal state lives in onboarding_profiles.data.manifestations under existing RLS.
-- The application migrates primaryGoal on first authenticated sync and preserves
-- untagged historical rows through the immutable legacyGoalId association.
create index if not exists check_ins_user_goal_created_idx
  on public.check_ins (user_id, (data->>'manifestationId'), created_at desc);
create index if not exists journal_entries_user_goal_date_idx
  on public.journal_entries (user_id, (data->>'manifestationId'), date desc);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'manifestation_state_shape' and conrelid = 'public.onboarding_profiles'::regclass) then
    alter table public.onboarding_profiles add constraint manifestation_state_shape
      check (not (data ? 'manifestations') or coalesce((
        jsonb_typeof(data->'manifestations') = 'object'
        and data->'manifestations'->>'version' = '1'
        and jsonb_typeof(data->'manifestations'->'goals') = 'array'
        and jsonb_typeof(data->'manifestations'->'innerFoundation') = 'string'
        and (data->'manifestations') ? 'primaryGoalId'
      ), false));
  end if;
end $$;
