# ClearPth

ClearPth is a free MVP self-reflection web app for aligning Thinking, Willing, and Feeling into a more practical state of Being.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Supabase Auth and database profile records

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

## Supabase Login And Profile Records

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

For email confirmations to work on phones and other devices, set these in
Supabase under **Authentication -> URL Configuration**:

```txt
Site URL: https://www.clearpth.io
Redirect URLs:
https://clearpth.io/auth/callback
```

The app sends new account confirmation emails to `/auth/callback`, where
ClearPth completes the Supabase session and returns the user to Home.

Personal records are account-first. Check-ins, journal entries, and setup
profiles are saved only for signed-in users. Guest sessions can explore the app,
but personal records are not saved.

## What Is Included

- Landing page with the ClearPth model and CTA
- Daily Alignment Check-In form
- Patterns dashboard with score, integration debt, trends, pillar balance, journal rhythm, and depth analysis
- Daily Journal page for written or spoken reflection
- Results page with Being Score, state label, strongest and weakest pillars, and prescriptions
- Optional personalized result summary and prescription
- Account history page with calendar tracking, pattern insights, and clear history action
- Today page with the current day's check-in, journal status, signal, and correction
- Daily Guide chat for working through challenges with the ClearPth model
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
