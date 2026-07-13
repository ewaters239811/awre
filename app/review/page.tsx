"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, NotebookPen, Target } from "lucide-react";
import { AlignmentResult } from "@/components/alignment-result";
import { DailyFlow } from "@/components/daily-flow";
import { TeachingQuote } from "@/components/teaching-quote";
import { Button } from "@/components/ui/button";
import { saveCheckInToAccount } from "@/lib/account-data";
import { getCheckInDateKey, getCheckIns, updateCheckIn } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { CheckInResult, JournalEntry, PillarName } from "@/lib/types";

type AiStatus = "idle" | "loading" | "ready" | "unavailable";

export default function ReviewPage() {
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const requestedAiFor = useRef<string | null>(null);
  const todayKey = useCurrentDateKey();

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIns(getCheckIns());
      setJournalEntries(getJournalEntries());
    });
  }, []);

  const todayCheckIns = checkIns.filter(
    (item) => getCheckInDateKey(item) === todayKey,
  );
  const latestTodayCheckIn = todayCheckIns[0] ?? null;
  const todayJournal = journalEntries.find((entry) => entry.date === todayKey);
  const report = buildTodayReport(latestTodayCheckIn, todayJournal);

  useEffect(() => {
    if (
      !latestTodayCheckIn ||
      latestTodayCheckIn.aiAlignment ||
      requestedAiFor.current === latestTodayCheckIn.id
    ) {
      return;
    }

    requestedAiFor.current = latestTodayCheckIn.id;
    setAiStatus("loading");

    fetch("/api/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: latestTodayCheckIn,
        onboardingProfile: getOnboardingProfile(),
        recentJournalEntries: getJournalEntries().slice(0, 8).map((entry) => ({
          date: entry.date,
          content: entry.content,
        })),
      }),
    })
      .then((response) => response.json())
      .then(
        (payload: {
          enabled?: boolean;
          data?: CheckInResult["aiAlignment"];
        }) => {
          if (!payload.enabled || !payload.data) {
            setAiStatus("unavailable");
            return;
          }

          const updated: CheckInResult = {
            ...latestTodayCheckIn,
            aiAlignment: payload.data,
            aiGeneratedAt: new Date().toISOString(),
          };
          saveCheckInToAccount(updated)
            .then(() => updateCheckIn(updated))
            .catch(() => undefined);
          setCheckIns((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          setAiStatus("ready");
        },
      )
      .catch(() => setAiStatus("unavailable"));
  }, [latestTodayCheckIn]);

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-border/60 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="clearpth-page-kicker">Today</p>
            <h1 className="clearpth-page-title">Your Next Step Today</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Close the gap between your current state and the life you want.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card/35 px-4 py-3 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <DailyFlow
          checkedIn={Boolean(latestTodayCheckIn)}
          readToday={Boolean(latestTodayCheckIn)}
          journaled={Boolean(todayJournal?.content.trim())}
        />
      </section>

      <section className="mx-auto mt-6 max-w-6xl rounded-md border border-border/70 bg-card/30">
        <div className="grid divide-y divide-border/60 md:grid-cols-4 md:divide-x md:divide-y-0">
          <ReviewStat
            label="Score Today"
            value={latestTodayCheckIn?.beingScore.toFixed(1) ?? "-"}
          />
          <ReviewStat
            label="Check-ins"
            value={String(todayCheckIns.length)}
          />
          <ReviewStat
            label="Journal"
            value={todayJournal?.content.trim() ? "Done" : "Open"}
          />
          <ReviewStat label="Signal" value={report.signalLabel} />
        </div>
      </section>

      {!latestTodayCheckIn ? (
        <section className="mx-auto mt-8 max-w-6xl rounded-md border border-border/70 bg-card/30 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            No check-in today
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold">
            Today has not been measured yet.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Complete one check-in to reveal today&apos;s state. Add a journal
            entry if you want the pattern underneath the score to become clearer.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/check-in">Begin Check In</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/ritual">Open Journal</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-md border border-foreground/20 bg-card p-6 md:p-7">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Primary Signal
                </p>
              </div>
              <h2 className="mt-4 font-serif text-4xl font-semibold">
                {report.primaryTitle}
              </h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
                {report.primaryDetail}
              </p>
            </article>

            <article className="rounded-md border border-border/70 bg-card/30 p-6 md:p-7">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Next Step
                </p>
              </div>
              <p className="mt-4 font-serif text-3xl font-semibold">
                {report.correctionTitle}
              </p>
              <p className="mt-4 leading-7 text-muted-foreground">
                {report.correctionDetail}
              </p>
            </article>
          </section>

          <section className="mt-8">
            <AlignmentResult result={latestTodayCheckIn} aiStatus={aiStatus} />
          </section>
        </>
      )}

      <section className="mx-auto mt-8 max-w-6xl rounded-md border border-border/70 bg-card/30">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <NotebookPen className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Journal Prompt
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-7 text-muted-foreground">
            What pattern did today reveal, and what is one cleaner step you can
            take before the day ends?
          </p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/ritual">Open Journal</Link>
          </Button>
        </div>
      </section>

      {todayJournal?.content.trim() ? (
        <section className="mx-auto mt-5 max-w-6xl rounded-md border border-border/70 bg-card/30">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <NotebookPen className="h-5 w-5 text-primary" aria-hidden />
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                Today&apos;s Journal
              </p>
            </div>
          </div>
          <article className="px-5 py-4">
            <p className="text-sm leading-7 text-muted-foreground">
              {todayJournal.content}
            </p>
          </article>
        </section>
      ) : null}

      <TeachingQuote />
    </main>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold text-foreground">
        {value}
      </p>
    </article>
  );
}

function buildTodayReport(
  checkIn: CheckInResult | null,
  journal: JournalEntry | undefined,
) {
  if (!checkIn) {
    return {
      signalLabel: "Unmeasured",
      primaryTitle: "No signal recorded",
      primaryDetail: "Today needs one honest check-in before it can be read.",
      correctionTitle: "Create signal",
      correctionDetail:
        "Score Thinking, Willing, and Feeling, then name one choice your Being can make today.",
    };
  }

  const journalSignal = journal?.content.trim()
    ? "Your journal adds context to the score, so the review has both measurement and texture."
    : "A journal entry would add more context to the score before the day closes.";
  const weakest = checkIn.weakestPillar;
  const strongest = checkIn.strongestPillar;

  if (checkIn.beingScore < 6) {
    return {
      signalLabel: "Repair",
      primaryTitle: `Today is asking for repair in ${weakest}.`,
      primaryDetail: `${strongest} is still available as support, but ${weakest} is where the leak is most visible. ${journalSignal}`,
      correctionTitle: getCorrectionTitle(weakest),
      correctionDetail: getCorrectionDetail(weakest),
    };
  }

  if (checkIn.beingScore >= 8) {
    return {
      signalLabel: "Clear",
      primaryTitle: `${strongest} is carrying a clear signal today.`,
      primaryDetail: `Protect the conditions that made this score possible. Do not chase intensity; repeat the simple pattern that created coherence. ${journalSignal}`,
      correctionTitle: `Protect ${strongest}`,
      correctionDetail:
        "Choose one action that preserves today's clarity instead of spending it on distraction.",
    };
  }

  return {
    signalLabel: "Active",
    primaryTitle: `Today is workable through ${weakest}.`,
    primaryDetail: `${strongest} is giving you enough stability to make one clean correction in ${weakest}. ${journalSignal}`,
    correctionTitle: getCorrectionTitle(weakest),
    correctionDetail: getCorrectionDetail(weakest),
  };
}

function getCorrectionTitle(pillar: PillarName) {
  const titles: Record<PillarName, string> = {
    Thinking: "Clean the interpretation",
    Willing: "Take the first visible step",
    Feeling: "Regulate before deciding",
  };

  return titles[pillar];
}

function getCorrectionDetail(pillar: PillarName) {
  const details: Record<PillarName, string> = {
    Thinking:
      "Replace the dominant story with one cleaner sentence, then act from that sentence for the next hour.",
    Willing:
      "Choose the smallest useful action and complete it before seeking more certainty.",
    Feeling:
      "Let the emotion be present without giving it command. Breathe slowly, soften the body, and move from the state you are practicing.",
  };

  return details[pillar];
}
