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
Home offers one main button for the next unfinished step and a quiet completion
state when all three are done; its Daily Path is a non-clickable overview.
Tap the score for its rating breakdown, or the gap note for supporting writing.
A weekly comparison appears only with at least three distinct check-in days
in each seven-day period, using only the selected goal. Gap evidence is optional
and must quote the supplied writing exactly. Existing saved notes remain valid
without regenerating just to add evidence; expanding details does not save data
or request another reading.
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

## Weekly Letters

Signed-in users can open their private inbox from **Home → Weekly letters**.
A new edition is due every Monday at 12:00 UTC. It reflects on the preceding
Monday through Sunday for the active desired reality. When that week has no new
records for the goal, the letter draws on its most recent earlier check-ins,
journal entries, and progress. The letter is written in the user's voice and
covers where they are, what they are working toward, and one practical step to
keep going or adjust. Past letters stay in the inbox.

Signed-in users can select **Generate test letter** to preview a letter based
on the current week. The preview stays on the page and is separate from the
delivered inbox and its count.

To enable background delivery on an existing or new deployment:

1. Apply `supabase/migrations/20261127_weekly_letters.sql` to the app database.
2. Set `SUPABASE_SECRET_KEY` on the hosted Next.js app. An existing
   `SUPABASE_SERVICE_ROLE_KEY` also works. Set `WEEKLY_LETTERS_CRON_SECRET`
   to a separate randomly generated secret. Both belong in server-only variables.
3. In Supabase Vault, store the hosted app origin as `clearpth_site_url` and
   the matching delivery secret as `clearpth_weekly_letters_cron_secret`.
4. Run `supabase/schedules/weekly_letters.sql` in the Supabase SQL Editor.
   Supabase Cron calls the authenticated delivery endpoint every five minutes
   to drain the current edition and retry incomplete batches. The database
   allows one letter per account per edition. The inbox can be used after the
   migration, independently of the scheduler.

The job uses the app's existing OpenAI configuration when available, with a
first-person letter based on saved records when generation is unavailable.

## Wisdom Layer

`lib/wisdom.ts` contains 16 original ClearPth reflection briefs across Desire,
Identity, Detachment, and Stillness. Each includes a source, its historical or
religious context, an original principle, a question, and a modest practice.
These are adaptations, not quotations or scientific evidence. The initial
sources are kept distinct:

- [Epictetus, The Enchiridion](https://classics.mit.edu/Epictetus/epicench.html), sections 1, 2, 4, 8, and 33.
- [Teresa of Avila, Interior Castle](https://ccel.org/ccel/teresa/castle2/castle2.v.ii.html), First Mansions, chapter 2.
- [Rudolf Steiner, Knowledge of Higher Worlds](https://rsarchive.org/Books/GA010/English/RSPC1947/GA010_c01.html), chapter 1, especially Inner Tranquility.
- [Contemplative Prayer](https://www.vatican.va/content/catechism/en/part_four/section_one/chapter_three/article_1/iii_contemplative_prayer.html), paragraphs 2713 and 2716-2717.
- [Corpus Hermeticum I, translated excerpts and context](https://cswr.hds.harvard.edu/news/2026/02/13/corpus-hermeticum-i), the opening inquiry; translation by Matthew Andrews.

A deterministic phrase matcher selects at most two candidate briefs from the
user's writing, never from a low rating alone. It is deliberately small and
conservative, not a semantic search engine. A match is a possible lens, not
evidence of a hidden motive. Crisis and abuse language bypass this library.
No source pages are fetched at runtime, no new API or dependency is needed,
and the existing AI service may decline an unsuitable perspective.

- Home keeps its single concise gap note; matching briefs only inform new notes.
- Today offers a closed **Go deeper** disclosure only when a principle fits, with no source credits, tradition labels, or outbound reading links.
- Talk uses only the supplied conversation and its existing chat memory to select briefs, not journals, check-ins, or saved goals.
- Tune In uses one relevant practice without changing audio generation, pauses, playback controls, or saved-session signatures.

New alignment responses can include an optional `deeperPerspective` JSON object.
The server accepts only a selected principle ID and bounded plain-text fields.
References stay in the internal library and this documentation; source URLs
are not sent to the model. Routine guidance stays inside ClearPth without
citations or reading links. Direct questions about origins should be answered
honestly in plain language, without links. These presentation rules do not
restrict recommending human help or emergency services. An explicit
`null` means no deeper reflection. Existing saved readings and their cache
signatures are unchanged. When an older reading has no such field, Today can
offer a matching original brief without regenerating or resaving the reading.
Opening the disclosure itself performs no request and changes no data.
The new field fits the existing Supabase JSON payload; no schema migration is
required. Spiritual guidance must not promise external outcomes, blame hardship
on a person's state, or replace practical safety or professional support.
