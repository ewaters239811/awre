# ClearPth

ClearPth is a free MVP self-reflection web app for helping users align what they want, what they think, what they feel, and what they do.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Supabase Auth and database profile records

## Appearance

The original dark olive palette is restored, with sage (`#A6BB9A`), warm ivory,
and champagne (`#D1B97E`) highlights. Shared colors live in
`app/globals.css` and Tailwind semantic tokens, including legacy theme-class
aliases; no light-mode option is introduced. Palette tests cover text, button,
placeholder, focus, and input-boundary contrast without changing app behavior.
Subtle ambient light, staggered page entrances, control highlights, and a
decorative score-ring glow add motion without changing scores or saved readings.
All animation and transitions respect the device's reduced-motion preference.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Desired Realities

Home shows one primary manifestation and a shared, optional Inner Foundation.
Use **Manage** to create, edit, archive, complete, reactivate, or switch goals.
Each goal can have a category, optional target date, identity statement,
milestones, completed actions, and progress notes. Archived and completed goals
retain their history under **Include completed & archived -> Progress & history**.

The check-in form contains only Thinking, Feeling, and Acting ratings plus one
required journal entry. Submitting saves the writing to the existing goal-specific
journal and keeps an immutable `checkInJournal` snapshot and `journalEntryId` on
the check-in. The reading considers the scores and submitted writing together;
older four-answer check-ins remain supported. Existing writing for the same
goal/day is appended to, not replaced. A failed save keeps the form filled and
retries the same record IDs. These additive JSON fields need no schema migration.

Journaling lives inside **Check In**; there is no separate Journal destination.
The old `/ritual` URL redirects to `/check-in#journal`. Users can dictate where
browser speech recognition is supported and append a later reflection without
submitting a second set of daily ratings. Past entries live under
**Settings -> Data -> Journal history**, collapsed by default and never listed
on Check In. Both result views
use `buildCheckInReading` to send the journal and ratings to personalization,
with goal-isolated journal context and a stable content-based cache signature.

The Daily Path is **Check In -> Read -> Tune In**.
Today keeps the existing header and Daily Path, then leads with the daily gap,
alignment score, and a single internal-pattern summary. New personalized readings
include an optional `dailyGap` alongside the existing analysis; older cached
readings are preserved. Action completion and the full reading remain available
under **More from today**. The read-completion button marks the same Daily Path
step as before. Loading and retry states do not display fallback text as if it
were personalized analysis.
Gap focuses on the recurring gap, one helpful adjustment, the alignment trend,
and the existing check-in calendar and selected-day details. Goal developments
and milestones remain under **Your Desired Reality -> Progress & history**, not
on Gap. Removing that panel does not remove any goal progress or saved records.
Check-ins use Thinking,
Feeling, and Acting (choices/actions), averaged into a reflection score. The
legacy `willingScore` field and internal `Doing` enum are retained for backwards
compatibility. Progress separates self-reported alignment from real-world
developments; neither the score nor a reading guarantees an external result.

Goal state is stored in `onboarding_profiles.data.manifestations`, protected by
the existing account RLS policies. Check-ins and journals keep their existing
tables and gain a `manifestationId` inside `data`. No new dependency is needed.

For an existing Supabase database, run this additive migration in the SQL Editor:

```txt
supabase/migrations/20261019_manifestations.sql
```

The application also performs an idempotent data migration on authenticated
sync: the original `primaryGoal` becomes the first goal with a deterministic ID.
It is never automatically treated as an Inner Foundation. Untagged older
check-ins and journals stay associated with the immutable `legacyGoalId`, even
after switching focus. Migration saves the profile before replacing the browser
mirror. Existing content is not deleted or bulk rewritten. An explicit option
lets users move their original statement into their foundation and archive its
goal while preserving its history.

Validation and checks:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Tests cover migration, switching, same-day goal isolation, reloads, account
save/restore through a fake Supabase boundary, validation, and goal completion.
Live Supabase migration and real-device authenticated testing remain deployment
checks; the test suite does not use production accounts or paid AI requests.

## Optional AI Personalization

ClearPth works without AI. To enable personalized results and AI-generated teaching quotes, create a `.env.local` file:

```bash
OPENAI_API_KEY=your_api_key_here
AURA_AI_MODEL=gpt-5.4-mini
```

Then restart the dev server.

## Optional ElevenLabs Meditation Audio

Tune In can play realistic generated meditation audio with ElevenLabs. Add
these values to `.env.local`:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_preferred_voice_id
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_VOICE_SPEED=0.7
```

`ELEVENLABS_VOICE_ID` is optional. If omitted, the app uses the ElevenLabs
example voice ID from their text-to-speech API docs. For the best ClearPth
experience, choose or create a calm feminine meditation voice in ElevenLabs and
use that voice ID. Tune In preserves meditation line breaks and longer pauses so
sessions can breathe naturally instead of being forced into five minutes.

## Supabase Login And Profile Records

ClearPth can save a user's check-ins, journal entries, and onboarding profile to
their login profile with Supabase.

1. Create a Supabase project.
2. Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_api_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_SITE_URL=https://clearpth.io
```

If your Supabase dashboard only shows an `anon` key, this also works:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Open the Supabase SQL Editor and run the contents of:

```txt
supabase/schema.sql
```

4. Restart the dev server.
5. Open `/login` and create an account.

For password reset links to work on phones and other devices, set these in
Supabase under **Authentication -> URL Configuration**:

```txt
Site URL: https://clearpth.io
Redirect URLs:
https://clearpth.io/auth/callback
https://clearpth.io/auth/confirm
https://clearpth.io/reset-password
```

New accounts are designed to sign in immediately when email confirmation is
disabled in Supabase.

For the most reliable password reset flow, update the Supabase
**Authentication -> Email Templates -> Reset Password** link to use the recovery
token hash:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
>
  Reset your password
</a>
```

ClearPth verifies that recovery token at `/auth/confirm`, creates the temporary
Supabase session, and sends the user to `/reset-password` to choose a new
password.

Personal records are account-first. Check-ins, journal entries, and setup
profiles are saved only for signed-in users.

## What Is Included

- Landing page with the ClearPth model and CTA
- Daily Alignment Check-In form
- Patterns dashboard with score, integration debt, trends, pillar balance, journal rhythm, and depth analysis
- Journal within Check In for written or spoken reflection
- Results page with Being Score, state label, strongest and weakest pillars, and prescriptions
- Optional personalized result summary and prescription
- Account history page with calendar tracking, pattern insights, and clear history action
- Today page with the current day's check-in, journal status, signal, and correction
- Daily Guide chat for working through challenges with the ClearPth model
- Tune In page with tailored meditations and optional ElevenLabs audio
- Single teaching quote based on the latest check-in when an API key is configured
- About page explaining the model
- Crisis-language guardrail message for severe distress or self-harm language

## Data Storage

ClearPth stores personal records in Supabase for signed-in users:

- Check-ins
- Journal entries
- Setup profiles

When a user signs out, the local account cache is cleared from that browser.
Theme and audio preferences may remain on the device as non-account preferences.

There is optional Supabase authentication and profile sync. Payment, email
marketing, and analytics are not included in this MVP. The AI layer is optional
and only runs when `OPENAI_API_KEY` is configured.

## Supabase Data Model

The schema in `supabase/schema.sql` creates:

- `check_ins`
- `journal_entries`
- `onboarding_profiles`

Each table uses row-level security so users can only access their own records.
