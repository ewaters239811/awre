# Manifestation Experience

## Implementation Plan And Architecture

1. Extend the existing profile JSON with versioned goals and a shared foundation.
2. Migrate `primaryGoal` deterministically, retaining its exact text.
3. Scope existing check-in/journal storage by goal without rewriting other records.
4. Surface the primary goal on Home, Check In, Today, Journal and Gap.
5. Add independent outer-progress records and preserve archived/completed history.
6. Verify migration, persistence, switching and completion with regression tests.

The application remains Next.js App Router with React client state, Tailwind,
existing UI primitives, Supabase browser authentication and RLS JSON records.
Existing OpenAI routes provide readings and teachings; ElevenLabs audio remains
available. Navigation is unchanged. `/manifestations` is a management subpage
linked from Home and Settings, not an extra daily tab.

## Data Contracts

- `OnboardingProfile.manifestations`: version, goals, primaryGoalId, immutable
  legacyGoalId, and optional innerFoundation. Goals contain outcome, category,
  identity, targetDate, status, timestamps and developments.
- `CheckInDraft/Result`: optional manifestationId, desiredReality and
  innerFoundation snapshots; optional readAt tracks the Read step.
- `JournalEntry`: optional manifestationId; existing content, dates and aligned
  action completion metadata remain intact.
- `GoalDevelopment`: milestone, completed action or progress note with timestamps.
- `getAllCheckIns/getAllJournalEntries`: unfiltered account data for preservation
  and account totals. Existing getters default to the primary goal.
- `goalIdForRecord`: untagged historical records resolve to legacyGoalId, never
  the currently selected goal.

The profile's legacy primaryGoal string mirrors the selected active goal so
existing prompts and setup forms continue to work. Legacy setup edits reconcile
only that goal's outcome. Identity and shared Inner Foundation are separate;
the old desiredState field is not automatically reclassified.

## Affected Surfaces

- Core: lib/types, manifestations, onboarding-storage, alignment, journal-storage,
  account-data, use-manifestations, ai-reading-signature, daily-path, pillars.
- UI: manifestation-focus/manager/progress; Home, Check In, Today, Journal,
  Results, Gap, History, Settings and Tune In context/reset behavior.
- Services: existing personalization, teaching and meditation routes receive the
  selected desired reality and foundation alongside their current inputs.
- Persistence: additive Supabase SQL indexes and profile shape constraint;
  existing tables and RLS stay in place.

## Compatibility And Limits

Old records remain readable without a bulk backfill. A migrated profile is saved
to the account on first authenticated sync. Users can explicitly reclassify the
old statement into their foundation, which archives its goal without deletion.
Goals can be qualitative or measurable, and dates/milestones are optional.

Goal edits use the app's existing whole-profile persistence convention. Concurrent
edits to the same profile on multiple devices use last-write-wins, as before.
The SQL file must be applied to the live database separately; no live migration
or paid AI request is run by the automated tests.
