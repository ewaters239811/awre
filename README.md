# AWRE

AWRE is a free MVP self-reflection web app for aligning Thinking, Willing, and Feeling into a more magnetic state of Being.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Browser `localStorage`

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Optional AI Personalization

AWRE works without AI. To enable personalized results and AI-generated teaching quotes, create a `.env.local` file:

```bash
OPENAI_API_KEY=your_api_key_here
AURA_AI_MODEL=gpt-5.4-mini
```

Then restart the dev server.

## What Is Included

- Landing page with the AWRE model and CTA
- Daily Alignment Check-In form
- Being Dashboard with score, integration debt, trends, pillar balance, ritual rhythm, and depth analysis
- Daily Ritual page for morning intention and evening reflection
- Results page with Being Score, state label, strongest and weakest pillars, and prescriptions
- Optional personalized result summary and prescription
- Local history page with calendar tracking, pattern insights, and clear history action
- Weekly Review page with score trends and ritual notes
- Daily Guide chat for working through challenges with the AWRE model
- Single teaching quote based on the latest check-in when an API key is configured
- About page explaining the model
- Crisis-language guardrail message for severe distress or self-harm language

## Local Storage

Check-ins are saved in the browser under:

```txt
aura.checkIns.v1
```

The storage keys keep the original internal prefix so existing local data continues to work after the AWRE rename.

Guide conversations are saved in the browser under:

```txt
aura.guideConversations.v1
```

Daily rituals are saved in the browser under:

```txt
aura.dailyRituals.v1
```

There is no authentication, payment, email, or analytics in this MVP. The AI layer is optional and only runs when `OPENAI_API_KEY` is configured.

## Future Supabase Direction

1. Add Supabase Auth with email/password or magic link.
2. Create a `check_ins` table with user id, scores, reflection text, score metadata, and timestamp.
3. Replace the localStorage helpers in `lib/alignment.ts` with Supabase read/write functions.
4. Add row-level security so users can only access their own check-ins.
5. Keep localStorage as an optional offline draft cache.
