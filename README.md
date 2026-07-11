# ClearPth

ClearPth is a free MVP self-reflection web app for aligning Thinking, Willing, and Feeling into a more practical state of Being.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Browser `localStorage`
- Optional Supabase Auth and database profile sync

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Optional AI Personalization

ClearPth works without AI. To enable personalized results and AI-generated teaching quotes, create a `.env.local` file:

```bash
OPENAI_API_KEY=your_api_key_here
AURA_AI_MODEL=gpt-5.4-mini
```

Then restart the dev server.

## Optional Supabase Login And Profile Sync

ClearPth can save a user's check-ins, journal entries, and onboarding profile to
their login profile with Supabase.

1. Create a Supabase project.
2. Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_api_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
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

The app remains local-first. Existing browser data is preserved, then copied into
the signed-in user's Supabase profile automatically.

## What Is Included

- Landing page with the ClearPth model and CTA
- Daily Alignment Check-In form
- Patterns dashboard with score, integration debt, trends, pillar balance, journal rhythm, and depth analysis
- Daily Journal page for written or spoken reflection
- Results page with Being Score, state label, strongest and weakest pillars, and prescriptions
- Optional personalized result summary and prescription
- Local history page with calendar tracking, pattern insights, and clear history action
- Today page with the current day's check-in, journal status, signal, and correction
- Daily Guide chat for working through challenges with the ClearPth model
- Single teaching quote based on the latest check-in when an API key is configured
- About page explaining the model
- Crisis-language guardrail message for severe distress or self-harm language

## Local Storage

Check-ins are saved in the browser under:

```txt
aura.checkIns.v1
```

The storage keys keep the original internal prefix so existing local data continues to work after earlier brand changes.

Journal entries are saved in the browser under:

```txt
clearpth.journalEntries.v1
```

There is optional Supabase authentication and profile sync. Payment, email
marketing, and analytics are not included in this MVP. The AI layer is optional
and only runs when `OPENAI_API_KEY` is configured.

## Supabase Data Model

The schema in `supabase/schema.sql` creates:

- `check_ins`
- `journal_entries`
- `onboarding_profiles`

Each table uses row-level security so users can only access their own records.
