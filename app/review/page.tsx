"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { DailyFlow } from "@/components/daily-flow";
import { TodayReading } from "@/components/today-reading";
import { Button } from "@/components/ui/button";
import { useManifestations } from "@/lib/use-manifestations";
import {
  saveCheckInToAccount,
  saveJournalEntryToAccount,
} from "@/lib/account-data";
import { buildCheckInReading } from "@/lib/check-in-reading";
import {
  CHECK_INS_CHANGED_EVENT,
  getCheckInDateKey,
  getCheckIns,
  updateCheckIn,
} from "@/lib/alignment";
import {
  createEmptyJournalEntry,
  getJournalEntries,
  getAllJournalEntries,
  JOURNAL_CHANGED_EVENT,
  saveJournalEntry,
} from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { markTodayRead } from "@/lib/daily-path";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import {
  hasMeditationCompletionForDate,
  MEDITATION_COMPLETED_EVENT,
} from "@/lib/meditation-storage";
import type { CheckInResult, JournalEntry } from "@/lib/types";

type AiStatus = "idle" | "loading" | "ready" | "unavailable";

export default function ReviewPage() {
  const { primary } = useManifestations();
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [meditated, setMeditated] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [retry, setRetry] = useState(0);
  const [readError, setReadError] = useState("");
  const [savingRead, setSavingRead] = useState(false);
  const [actionError, setActionError] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const requestedAiFor = useRef<string | null>(null);
  const checkInTodayKey = useCurrentCheckInDateKey();
  const calendarTodayKey = useCurrentDateKey();

  useEffect(() => {
    const refresh = () => {
      setCheckIns(getCheckIns());
      setJournalEntries(getJournalEntries());
      setMeditated(hasMeditationCompletionForDate(calendarTodayKey));
      setLoaded(true);
    };
    queueMicrotask(refresh);
    window.addEventListener(CHECK_INS_CHANGED_EVENT, refresh);
    window.addEventListener(JOURNAL_CHANGED_EVENT, refresh);
    window.addEventListener(MEDITATION_COMPLETED_EVENT, refresh);
    return () => {
      window.removeEventListener(CHECK_INS_CHANGED_EVENT, refresh);
      window.removeEventListener(JOURNAL_CHANGED_EVENT, refresh);
      window.removeEventListener(MEDITATION_COMPLETED_EVENT, refresh);
    };
  }, [primary?.id, calendarTodayKey]);

  const latestTodayCheckIn =
    checkIns.find((item) => getCheckInDateKey(item) === checkInTodayKey) ??
    null;
  const todayJournal = journalEntries.find(
    (entry) => entry.date === calendarTodayKey,
  );
  const alignedAction =
    todayJournal?.alignedAction?.trim() ||
    latestTodayCheckIn?.aiAlignment?.actionStep ||
    (aiStatus === "unavailable"
      ? latestTodayCheckIn?.prescription.actionStep
      : undefined);
  const actionCompleted = Boolean(todayJournal?.alignedActionCompletedAt);

  const toggleAlignedAction = async () => {
    if (!latestTodayCheckIn || savingAction || !alignedAction) return;
    setSavingAction(true);
    setActionError("");
    const existing = todayJournal ?? createEmptyJournalEntry(calendarTodayKey);
    const nextEntry: JournalEntry = {
      ...existing,
      manifestationId: latestTodayCheckIn.manifestationId ?? primary?.id,
      alignedAction,
      alignedActionCompletedAt: actionCompleted
        ? undefined
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveJournalEntryToAccount(nextEntry);
      saveJournalEntry(nextEntry);
      setJournalEntries(getJournalEntries());
    } catch {
      setActionError("Could not save your action. Please try again.");
    } finally {
      setSavingAction(false);
    }
  };

  const markRead = async () => {
    if (!latestTodayCheckIn || savingRead) return;
    setReadError("");
    setSavingRead(true);
    try {
      await markTodayRead();
    } catch {
      setReadError("Could not save. Please try again.");
    } finally {
      setSavingRead(false);
    }
  };

  useEffect(() => {
    if (!latestTodayCheckIn) return;
    const reading = buildCheckInReading(
      latestTodayCheckIn,
      getOnboardingProfile(),
      getAllJournalEntries(),
    );
    const contextSignature = reading.signature;
    const shouldGenerate =
      !latestTodayCheckIn.aiAlignment ||
      Boolean(
        latestTodayCheckIn.aiContextSignature &&
          latestTodayCheckIn.aiContextSignature !== contextSignature,
      );
    const requestKey = `${latestTodayCheckIn.id}:${contextSignature}:${retry}`;
    if (
      (!shouldGenerate && retry === 0) ||
      requestedAiFor.current === requestKey
    ) {
      setAiStatus(latestTodayCheckIn.aiAlignment ? "ready" : "unavailable");
      return;
    }
    requestedAiFor.current = requestKey;
    setAiStatus("loading");
    const controller = new AbortController();
    fetch("/api/personalize", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reading.request),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Reading unavailable");
        return response.json();
      })
      .then(
        (payload: {
          enabled?: boolean;
          data?: CheckInResult["aiAlignment"];
        }) => {
          if (controller.signal.aborted) return;
          if (
            !payload.enabled ||
            !payload.data ||
            typeof payload.data.summary !== "string" ||
            !payload.data.summary.trim()
          ) {
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
          setRetry(0);
          setAiStatus("ready");
        },
      )
      .catch(() => {
        if (!controller.signal.aborted) setAiStatus("unavailable");
      });
    return () => {
      controller.abort();
      requestedAiFor.current = null;
    };
  }, [latestTodayCheckIn, retry]);

  return (
    <main className="clearpth-page-shell">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-border/42 pb-6 md:flex-row md:items-end md:justify-between md:pb-8">
          <div>
            <p className="clearpth-page-kicker">Today</p>
            <h1 className="clearpth-page-title">Today&apos;s Review</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
              See today&apos;s gap, what is already aligned, and what needs one
              clean adjustment.
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
          readToday={Boolean(latestTodayCheckIn?.readAt)}
          meditated={meditated}
        />
      </section>
      <div className="mx-auto max-w-6xl">
        <TodayReading
          result={latestTodayCheckIn}
          loaded={loaded}
          status={aiStatus}
          onRetry={() => setRetry((value) => value + 1)}
          onRead={markRead}
          savingRead={savingRead}
          error={readError}
        />
        {latestTodayCheckIn ? (
          <details className="border-t border-border/40 pt-2">
            <summary className="cursor-pointer py-3 text-sm text-muted-foreground">
              More from today
            </summary>
            <div className="py-5">
              {alignedAction ? (
                <div className="max-w-3xl">
                  <h2 className="text-sm font-medium">Your next step</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {alignedAction}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    disabled={savingAction}
                    onClick={toggleAlignedAction}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {savingAction
                      ? "Saving..."
                      : actionCompleted
                        ? "Completed"
                        : "Mark Complete"}
                  </Button>
                  {actionError ? (
                    <p role="alert" className="mt-3 text-sm text-primary">
                      {actionError}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-4 text-sm text-primary">
                <Link
                  href={`/results?id=${latestTodayCheckIn.id}`}
                  className="underline underline-offset-4"
                >
                  Full reading
                </Link>
                <Link
                  href="/check-in#journal"
                  className="underline underline-offset-4"
                >
                  Add a reflection
                </Link>
              </div>
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}
