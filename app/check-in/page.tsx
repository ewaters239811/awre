"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalInput } from "@/components/journal-input";
import { SavedCheckInJournal } from "@/components/saved-check-in-journal";
import { ScoreSlider } from "@/components/score-slider";
import { useManifestations } from "@/lib/use-manifestations";
import { getCurrentAccount } from "@/lib/account-data";
import { CHECK_INS_CHANGED_EVENT, getCheckInForDate } from "@/lib/alignment";
import {
  createCheckInSession,
  saveCheckInSession,
  type CheckInSession,
} from "@/lib/check-in-session";
import { getJournalEntryForDate } from "@/lib/journal-storage";
import { toDateKey } from "@/lib/date-key";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import type { CheckInResult } from "@/lib/types";

const initialScores = { thinkingScore: 5, willingScore: 5, feelingScore: 5 };
const crisisPattern =
  /\b(suicide|self[-\s]?harm|kill myself|end my life|can't go on|severe depression|crisis)\b/i;

export default function CheckInPage() {
  const router = useRouter();
  const { primary, state: manifestationState } = useManifestations();
  const todayKey = useCurrentCheckInDateKey();
  const [scores, setScores] = useState(initialScores);
  const [journal, setJournal] = useState("");
  const [error, setError] = useState("");
  const [supportMessage, setSupportMessage] = useState(false);
  const [todaysCheckIn, setTodaysCheckIn] = useState<CheckInResult | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const pendingSession = useRef<{
    key: string;
    session: CheckInSession;
  } | null>(null);

  useEffect(() => {
    const refresh = () =>
      setTodaysCheckIn(getCheckInForDate(todayKey, primary?.id));
    queueMicrotask(refresh);
    window.addEventListener(CHECK_INS_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener(CHECK_INS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [todayKey, primary?.id]);

  useEffect(() => {
    queueMicrotask(() => {
      setScores(initialScores);
      setJournal("");
      setError("");
      setSupportMessage(false);
      pendingSession.current = null;
    });
  }, [primary?.id, todayKey]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || !primary) return;
    setError("");
    setSupportMessage(false);
    if (crisisPattern.test(journal)) {
      setSupportMessage(true);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const existing = getCheckInForDate(todayKey, primary.id);
      if (existing) {
        setTodaysCheckIn(existing);
        router.push("/review");
        return;
      }
      const account = await getCurrentAccount();
      if (!account) throw new Error("Please sign in to save your check-in.");
      const journalDate = toDateKey(new Date());
      const key = JSON.stringify([
        account.id,
        primary.id,
        primary.outcome,
        manifestationState?.innerFoundation,
        todayKey,
        journalDate,
        scores,
        journal.trim(),
      ]);
      if (pendingSession.current?.key !== key) {
        pendingSession.current = {
          key,
          session: createCheckInSession({
            scores,
            content: journal,
            goal: primary,
            innerFoundation: manifestationState?.innerFoundation,
            journalDate,
            existingJournal: getJournalEntryForDate(journalDate, primary.id),
          }),
        };
      }
      const session = pendingSession.current.session;
      await saveCheckInSession(session);
      setJournal("");
      setTodaysCheckIn(session.result);
      router.push("/review");
    } catch (cause) {
      setError(
        cause instanceof Error &&
          cause.message === "Please sign in to save your check-in."
          ? cause.message
          : "Your check-in couldn't be completed. Your writing is still here; please try again.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="clearpth-page-shell">
      <div className="mx-auto max-w-2xl">
        <header>
          <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Check In
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            Rate your alignment. Write about your day.
          </p>
        </header>
        {primary ? (
          <div className="mt-7 border-b border-border/45 pb-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Your desired reality
              </p>
              <Link
                href="/manifestations"
                className="inline-flex min-h-10 items-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Change focus
              </Link>
            </div>
            <p className="mt-1 break-words text-base leading-7 text-foreground/90">
              {primary.outcome}
            </p>
          </div>
        ) : (
          <section className="my-8 border-y border-border/45 py-7">
            <p className="text-sm leading-7 text-muted-foreground">
              Choose what you want to work toward before checking in.
            </p>
            <Button asChild className="mt-4">
              <Link href="/manifestations">Your Desired Reality</Link>
            </Button>
          </section>
        )}
        {todaysCheckIn ? (
          <section className="py-9">
            <h2 className="font-serif text-2xl font-semibold">
              You checked in today.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Your alignment is {todaysCheckIn.beingScore.toFixed(1)}/10. You
              can add to your journal anytime.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/review">
                  View Today&apos;s Result{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="mt-8">
              <SavedCheckInJournal
                key={todaysCheckIn.id}
                result={todaysCheckIn}
              />
            </div>
          </section>
        ) : primary ? (
          <form className="mt-8" onSubmit={submit}>
            <fieldset
              disabled={saving}
              className="min-w-0 space-y-9 disabled:opacity-70"
            >
              <section aria-labelledby="alignment-heading">
                <h2
                  id="alignment-heading"
                  className="font-serif text-2xl font-semibold"
                >
                  Current Alignment
                </h2>
                <div className="mt-6 space-y-7">
                  <ScoreSlider
                    label="Thinking"
                    disabled={saving}
                    description="How aligned are your thoughts with your desired reality today?"
                    value={scores.thinkingScore}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        thinkingScore: value,
                      }))
                    }
                  />
                  <ScoreSlider
                    label="Feeling"
                    disabled={saving}
                    description="How closely do your emotions reflect the person you are becoming?"
                    value={scores.feelingScore}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        feelingScore: value,
                      }))
                    }
                  />
                  <ScoreSlider
                    label="Acting"
                    disabled={saving}
                    description="How consistently are your choices and actions moving you toward your desired reality?"
                    value={scores.willingScore}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        willingScore: value,
                      }))
                    }
                  />
                </div>
              </section>
              <JournalInput
                key={primary.id}
                value={journal}
                onChange={setJournal}
                disabled={saving}
              />
              {supportMessage ? (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-md border border-primary/35 bg-primary/10 p-4 text-sm leading-6"
                >
                  <AlertTriangle
                    className="mt-1 h-5 w-5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <p>
                    ClearPth is a self-reflection tool, not crisis support. If
                    you may hurt yourself or feel in immediate danger, please
                    call emergency services now or contact a trusted person.
                  </p>
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm leading-6 text-primary">
                  {error}
                </p>
              ) : null}
              <div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={saving || !journal.trim()}
                >
                  {saving ? "Saving..." : "See My Alignment"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
                <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
                  A personal reflection, not a measure of your worth or a
                  guarantee of results.
                </p>
              </div>
            </fieldset>
          </form>
        ) : null}
      </div>
    </main>
  );
}
