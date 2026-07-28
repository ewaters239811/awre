"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, NotebookPen, Target } from "lucide-react";
import { AlignmentResult } from "@/components/alignment-result";
import { DailyFlow } from "@/components/daily-flow";
import { TeachingQuote } from "@/components/teaching-quote";
import { Button } from "@/components/ui/button";
import { saveCheckInToAccount, saveJournalEntryToAccount } from "@/lib/account-data";
import { buildAiReadingSignature } from "@/lib/ai-reading-signature";
import { getCheckInDateKey, getCheckIns, updateCheckIn } from "@/lib/alignment";
import {
  createEmptyJournalEntry,
  getJournalEntries,
  saveJournalEntry,
} from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { CheckInResult, JournalEntry, PillarName } from "@/lib/types";

type AiStatus = "idle" | "loading" | "ready" | "unavailable";

export default function ReviewPage() {
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const requestedAiFor = useRef<string | null>(null);
  const checkInTodayKey = useCurrentCheckInDateKey();
  const calendarTodayKey = useCurrentDateKey();

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIns(getCheckIns());
      setJournalEntries(getJournalEntries());
    });
  }, []);

  const todayCheckIns = checkIns.filter(
    (item) => getCheckInDateKey(item) === checkInTodayKey,
  );
  const latestTodayCheckIn = todayCheckIns[0] ?? null;
  const todayJournal = journalEntries.find(
    (entry) => entry.date === calendarTodayKey,
  );
  const report = buildTodayReport(latestTodayCheckIn, todayJournal);
  const alignedAction =
    todayJournal?.alignedAction?.trim() ||
    latestTodayCheckIn?.aiAlignment?.actionStep ||
    latestTodayCheckIn?.prescription.actionStep ||
    report.correctionDetail;
  const actionCompleted = Boolean(todayJournal?.alignedActionCompletedAt);

  const toggleAlignedAction = async () => {
    if (!latestTodayCheckIn) return;

    const existing = todayJournal ?? createEmptyJournalEntry(calendarTodayKey);
    const nextEntry: JournalEntry = {
      ...existing,
      alignedAction,
      alignedActionCompletedAt: actionCompleted ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveJournalEntry(nextEntry);
    setJournalEntries(getJournalEntries());
    try {
      await saveJournalEntryToAccount(nextEntry);
    } catch {
      // The local mirror stays responsive even if the account save is delayed.
    }
  };

  useEffect(() => {
    if (!latestTodayCheckIn) {
      return;
    }

    const onboardingProfile = getOnboardingProfile();
    const recentJournalEntries = getJournalEntries().slice(0, 8);
    const contextSignature = buildAiReadingSignature({
      result: latestTodayCheckIn,
      onboardingProfile,
      journalEntries: recentJournalEntries,
    });
    const shouldGenerate =
      !latestTodayCheckIn.aiAlignment ||
      Boolean(
        latestTodayCheckIn.aiContextSignature &&
          latestTodayCheckIn.aiContextSignature !== contextSignature,
      );
    const requestKey = `${latestTodayCheckIn.id}:${contextSignature}`;

    if (!shouldGenerate || requestedAiFor.current === requestKey) {
      setAiStatus(latestTodayCheckIn.aiAlignment ? "ready" : "unavailable");
      return;
    }

    requestedAiFor.current = requestKey;
    setAiStatus("loading");

    fetch("/api/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: latestTodayCheckIn,
        onboardingProfile,
        recentJournalEntries: recentJournalEntries.map((entry) => ({
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
            aiContextSignature: contextSignature,
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
    <main className="clearpth-page-shell">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-border/42 pb-6 md:flex-row md:items-end md:justify-between md:pb-8">
          <div>
            <p className="clearpth-page-kicker">Today</p>
            <h1 className="clearpth-page-title">Today&apos;s Review</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
              See where you are, what is helping, and what to focus on next.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full border border-border/42 bg-card/24 px-4 py-2 text-xs text-muted-foreground md:rounded-md md:py-3 md:text-sm">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-6xl">
        <DailyFlow
          checkedIn={Boolean(latestTodayCheckIn)}
          readToday={Boolean(latestTodayCheckIn)}
          journaled={Boolean(todayJournal?.content.trim())}
        />
      </section>

      <section className="mx-auto mt-6 max-w-6xl overflow-hidden rounded-[1.35rem] border border-border/42 bg-card/20 md:mt-7 md:rounded-md">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <ReviewStat
            label="Score"
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
          <ReviewStat label="Status" value={report.signalLabel} />
        </div>
      </section>

      {!latestTodayCheckIn ? (
        <section className="mx-auto mt-9 max-w-6xl rounded-[1.35rem] border border-border/50 bg-card/24 p-5 md:rounded-md md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            No check-in today
          </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">
            You have not checked in today.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Complete one check-in to see where you are and what to focus on next.
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
          <section className="mx-auto mt-9 grid max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[1.35rem] border border-foreground/12 bg-card/48 p-5 md:rounded-md md:p-7">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  What Stands Out
                </p>
              </div>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:mt-4 md:text-4xl">
                {report.primaryTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:mt-4 md:text-base md:leading-7">
                {report.primaryDetail}
              </p>
            </article>

            <article className="rounded-[1.35rem] border border-border/42 bg-card/22 p-5 md:rounded-md md:p-7">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  Next Step
                </p>
              </div>
              <p className="mt-3 font-serif text-2xl font-semibold leading-tight md:mt-4 md:text-3xl">
                {report.correctionTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground md:mt-4 md:text-base md:leading-7">
                {report.correctionDetail}
              </p>
            </article>
          </section>

          <section className="mx-auto mt-6 max-w-6xl rounded-[1.35rem] border border-primary/18 bg-primary/8 p-5 md:rounded-md md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" aria-hidden />
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                    Today&apos;s Next Step
                  </p>
                </div>
                <p className="mt-3 max-w-3xl font-serif text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                  {alignedAction}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This is the one step to focus on today.
                </p>
              </div>
              <Button
                type="button"
                variant={actionCompleted ? "secondary" : "default"}
                className="w-full shrink-0 md:w-auto"
                onClick={toggleAlignedAction}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {actionCompleted ? "Completed" : "Mark Complete"}
              </Button>
            </div>
            <Button asChild className="mt-4 w-full md:w-auto" variant="secondary">
              <Link href="/tune-in">Open Meditation</Link>
            </Button>
          </section>

          <section className="mt-8">
            <AlignmentResult
              result={latestTodayCheckIn}
              aiStatus={latestTodayCheckIn.aiAlignment ? "ready" : aiStatus}
            />
          </section>
        </>
      )}

      <section className="mx-auto mt-9 max-w-6xl rounded-[1.35rem] border border-border/42 bg-card/22 md:rounded-md">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <NotebookPen className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Journal
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-7 text-muted-foreground">
            What did today show you, and what is one clear step you can take
            before the day ends?
          </p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/ritual">Open Journal</Link>
          </Button>
        </div>
      </section>

      {todayJournal?.content.trim() ? (
        <section className="mx-auto mt-6 max-w-6xl rounded-[1.35rem] border border-border/42 bg-card/22 md:rounded-md">
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
    <article className="min-w-0 border-border/42 p-4 odd:border-r [&:nth-child(-n+2)]:border-b md:border-b-0 md:border-r md:p-5 md:last:border-r-0">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:text-xs md:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-2 break-words font-serif text-[1.65rem] font-semibold leading-tight text-foreground md:mt-3 md:text-4xl">
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
      primaryTitle: "No check-in yet",
      primaryDetail: "Check in first, then today can be reviewed.",
      correctionTitle: "Check in",
      correctionDetail:
        "Score your thoughts, actions, and emotions, then name one clear step.",
    };
  }

  const journalSignal = journal?.content.trim()
    ? "Your journal adds more context to today's score."
    : "A journal entry would make today's review clearer.";
  const weakest = checkIn.weakestPillar;
  const strongest = checkIn.strongestPillar;

  if (checkIn.beingScore < 6) {
    return {
      signalLabel: "Needs focus",
      primaryTitle: `${weakest} could use more focus today.`,
      primaryDetail: `${strongest} is helping you, and ${weakest} is the area with the most room to grow. ${journalSignal}`,
      correctionTitle: getCorrectionTitle(weakest),
      correctionDetail: getCorrectionDetail(weakest),
    };
  }

  if (checkIn.beingScore >= 8) {
    return {
      signalLabel: "Clear",
      primaryTitle: `${strongest} is working well today.`,
      primaryDetail: `Protect what made this score possible. Keep the day simple and repeat what is working. ${journalSignal}`,
      correctionTitle: `Protect what is working`,
      correctionDetail:
        "Choose one action that preserves today's clarity instead of spending it on distraction.",
    };
  }

  return {
      signalLabel: "Workable",
      primaryTitle: `${weakest} is the place to adjust.`,
      primaryDetail: `${strongest} is giving you enough stability to make one clear change in ${weakest}. ${journalSignal}`,
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
