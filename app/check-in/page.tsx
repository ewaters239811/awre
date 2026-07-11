"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Brain, Flame, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScoreSlider } from "@/components/score-slider";
import { buildResult, getTodaysCheckIn, saveCheckIn } from "@/lib/alignment";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import type { CheckInDraft, CheckInResult } from "@/lib/types";

const initialDraft: CheckInDraft = {
  thinkingScore: 5,
  willingScore: 5,
  feelingScore: 5,
  dominantThought: "",
  avoidedAction: "",
  currentFeeling: "",
  highestBeingChoice: "",
};

const crisisPattern =
  /\b(suicide|self[-\s]?harm|kill myself|end my life|can't go on|severe depression|crisis)\b/i;

export default function CheckInPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckInDraft>(initialDraft);
  const [error, setError] = useState("");
  const [supportMessage, setSupportMessage] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [todaysCheckIn, setTodaysCheckIn] = useState<CheckInResult | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setHasProfile(Boolean(getOnboardingProfile()));
      setTodaysCheckIn(getTodaysCheckIn());
    });
  }, []);

  const updateField = <K extends keyof CheckInDraft>(
    field: K,
    value: CheckInDraft[K],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const combinedText = [
      draft.dominantThought,
      draft.avoidedAction,
      draft.currentFeeling,
      draft.highestBeingChoice,
    ].join(" ");

    if (crisisPattern.test(combinedText)) {
      setSupportMessage(true);
      return;
    }

    try {
      const existing = getTodaysCheckIn();
      if (existing) {
        setTodaysCheckIn(existing);
        router.push(`/results?id=${existing.id}`);
        return;
      }

      const result = buildResult(draft);
      saveCheckIn(result);
      setTodaysCheckIn(result);
      router.push(`/results?id=${result.id}`);
    } catch {
      setError("Something interrupted the check-in. Please try again.");
    }
  };

  return (
    <main className="container py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Daily Alignment</p>
        <h1 className="clearpth-page-title">
          Move Through The Four Gates
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Score each pillar, name the pattern underneath it, then choose the
          Being you want to inhabit today.
        </p>

        {!hasProfile ? (
          <section className="aura-glass mt-6 rounded-lg p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              First Time Setup
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              ClearPth can give better guidance if it knows your main goal,
              current pattern, desired state, and preferred tone first.
            </p>
            <Button asChild className="mt-4">
              <Link href="/onboarding">Complete Setup</Link>
            </Button>
          </section>
        ) : (
          <div className="mt-5">
            <Button asChild variant="secondary" size="sm">
              <Link href="/onboarding">Update Setup</Link>
            </Button>
          </div>
        )}

        {todaysCheckIn ? (
          <section className="aura-glass mt-8 rounded-lg p-6 md:p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Today&apos;s Check-In Is Complete
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold">
              One check-in per day keeps the signal clean.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Today&apos;s Being score is {todaysCheckIn.beingScore.toFixed(1)}
              /10. You can review the result, add a journal entry, or return
              tomorrow for a new check-in.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/results?id=${todaysCheckIn.id}`}>
                  View Today&apos;s Result
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/review">Open Today</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/ritual">Add Journal</Link>
              </Button>
            </div>
          </section>
        ) : (
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <CheckInGate
            eyebrow="Gate 01"
            title="Thinking"
            description="What perception is organizing your inner world right now?"
            icon={<Brain className="h-5 w-5" aria-hidden />}
          >
            <ScoreSlider
              label="Thinking score"
              value={draft.thinkingScore}
              onChange={(value) => updateField("thinkingScore", value)}
            />
            <TextAreaField
              label="What thought has been dominating your mind?"
              value={draft.dominantThought}
              onChange={(value) => updateField("dominantThought", value)}
            />
          </CheckInGate>

          <CheckInGate
            eyebrow="Gate 02"
            title="Willing"
            description="Where is your energy ready to move, and where is it delaying?"
            icon={<Flame className="h-5 w-5" aria-hidden />}
          >
            <ScoreSlider
              label="Willing score"
              value={draft.willingScore}
              onChange={(value) => updateField("willingScore", value)}
            />
            <TextAreaField
              label="What action are you avoiding or being called to take?"
              value={draft.avoidedAction}
              onChange={(value) => updateField("avoidedAction", value)}
            />
          </CheckInGate>

          <CheckInGate
            eyebrow="Gate 03"
            title="Feeling"
            description="What emotional current is charging your identity today?"
            icon={<Heart className="h-5 w-5" aria-hidden />}
          >
            <ScoreSlider
              label="Feeling score"
              value={draft.feelingScore}
              onChange={(value) => updateField("feelingScore", value)}
            />
            <TextAreaField
              label="What feeling is currently running your state?"
              value={draft.currentFeeling}
              onChange={(value) => updateField("currentFeeling", value)}
            />
          </CheckInGate>

          <CheckInGate
            eyebrow="Gate 04"
            title="Being"
            description="Name the integrated choice that thought, action, and feeling can serve."
            icon={<Sparkles className="h-5 w-5" aria-hidden />}
          >
            <TextAreaField
              label="What would your highest Being choose today?"
              value={draft.highestBeingChoice}
              onChange={(value) => updateField("highestBeingChoice", value)}
              rows={5}
            />
          </CheckInGate>

          {supportMessage ? (
            <div className="rounded-md border border-primary/35 bg-primary/10 p-4 text-sm leading-6 text-foreground">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <p>
                  ClearPth is a self-reflection tool, not crisis support. If you may
                  hurt yourself or feel in immediate danger, please call
                  emergency services now, contact a trusted person, or in the
                  U.S. call or text 988 for the Suicide & Crisis Lifeline.
                </p>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-primary">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Your answers stay in this browser unless you clear history.
            </p>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Reveal My Alignment
            </Button>
          </div>
        </form>
        )}
      </div>
    </main>
  );
}

function CheckInGate({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="aura-glass rounded-lg p-5 md:p-6">
      <div className="grid gap-5 md:grid-cols-[0.75fr_1.25fr] md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              {icon}
            </span>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              {eyebrow}
            </p>
          </div>
          <h2 className="mt-4 font-serif text-3xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-md border border-border/55 bg-card/55 p-4">
          {children}
        </div>
      </div>
    </section>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
      />
    </div>
  );
}
