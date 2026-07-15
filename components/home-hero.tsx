"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyFlow } from "@/components/daily-flow";
import { getCurrentAccount } from "@/lib/account-data";
import {
  CHECK_INS_CHANGED_EVENT,
  getCheckInForDate,
  getCheckIns,
  getLatestCheckIn,
} from "@/lib/alignment";
import {
  getJournalEntries,
  getJournalEntryForDate,
} from "@/lib/journal-storage";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { CheckInResult, JournalEntry } from "@/lib/types";

type AccountUser = {
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

type HomeState = {
  user: AccountUser | null;
  latestCheckIn: CheckInResult | null;
  todaysCheckIn: CheckInResult | null;
  todaysJournal: JournalEntry | null;
  totalCheckIns: number;
  totalJournals: number;
};

export function HomeHero() {
  const checkInToday = useCurrentCheckInDateKey();
  const calendarToday = useCurrentDateKey();
  const [state, setState] = useState<HomeState>({
    user: null,
    latestCheckIn: null,
    todaysCheckIn: null,
    todaysJournal: null,
    totalCheckIns: 0,
    totalJournals: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshHomeState = () => {
      getCurrentAccount()
        .then((user) => {
          if (cancelled) return;
          setState({
            user,
            latestCheckIn: getLatestCheckIn(),
            todaysCheckIn: getCheckInForDate(checkInToday),
            todaysJournal: getJournalEntryForDate(calendarToday),
            totalCheckIns: getCheckIns().length,
            totalJournals: getJournalEntries().length,
          });
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    queueMicrotask(refreshHomeState);
    window.addEventListener(CHECK_INS_CHANGED_EVENT, refreshHomeState);

    return () => {
      cancelled = true;
      window.removeEventListener(CHECK_INS_CHANGED_EVENT, refreshHomeState);
    };
  }, [checkInToday, calendarToday]);

  if (!loaded || !state.user) {
    return <PublicHomeHero />;
  }

  return <PersonalHomeHero state={state} />;
}

function PublicHomeHero() {
  return (
    <div className="max-w-3xl pt-2 md:pt-0">
      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-primary sm:mb-4 sm:text-sm sm:tracking-[0.28em]">
        ClearPth
      </p>
      <h1 className="font-serif text-[3.25rem] font-semibold leading-[0.98] text-foreground sm:text-7xl lg:text-8xl">
        Close the gap.
      </h1>
      <div className="aura-luxury-line mt-6 max-w-lg" />
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-foreground/86 sm:mt-6 sm:text-2xl sm:leading-9">
        Name what you want once. Then use ClearPth each day to see whether your
        thoughts, actions, and emotions are becoming aligned enough to hold it.
      </p>
      <Button asChild size="lg" className="mt-7 w-full sm:w-auto">
        <Link href="/onboarding">
          Name What You Want
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
      <div className="mt-5 flex flex-wrap gap-2">
        {["name the desire", "measure the gap", "choose the next step"].map(
          (item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm"
            >
              {item}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function PersonalHomeHero({ state }: { state: HomeState }) {
  const firstName = useMemo(() => getFirstName(state.user), [state.user]);
  const hasCheckedInToday = Boolean(state.todaysCheckIn);
  const hasJournalToday = Boolean(state.todaysJournal?.content.trim());
  const nextHref = hasCheckedInToday
    ? hasJournalToday
      ? "/review"
      : "/ritual"
    : "/check-in";
  const nextLabel = hasCheckedInToday
    ? hasJournalToday
      ? "Review Today"
      : "Write Today"
    : "Begin Today";

  return (
    <div className="max-w-3xl pt-2 md:pt-0">
      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-primary sm:mb-4 sm:text-sm sm:tracking-[0.28em]">
        Welcome Back
      </p>
      <h1 className="max-w-2xl font-serif text-[2.65rem] font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
        Hi {firstName}. Let&apos;s close the gap.
      </h1>
      <div className="aura-luxury-line mt-5 max-w-lg sm:mt-6" />
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-foreground/86 sm:mt-6 sm:text-2xl sm:leading-9">
        {buildHomeMessage(state)}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={nextHref}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-card/38 px-4 py-3 sm:mt-6 sm:max-w-xl">
        <div className="grid grid-cols-3 gap-3 text-center">
          <HomeStatus
            label="Last"
            value={
              state.latestCheckIn
                ? state.latestCheckIn.beingScore.toFixed(1)
                : "Open"
            }
          />
          <HomeStatus
            label="Today"
            value={hasCheckedInToday ? "Done" : "Ready"}
          />
          <HomeStatus label="Journal" value={hasJournalToday ? "Done" : "Open"} />
        </div>
      </div>

      <div className="mt-4 sm:mt-5 sm:max-w-xl">
        <DailyFlow
          checkedIn={hasCheckedInToday}
          readToday={hasCheckedInToday}
          journaled={hasJournalToday}
        />
      </div>

      <Link
        href="/dashboard"
        className="mt-5 inline-flex text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        View patterns
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

function HomeStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">
        {value}
      </p>
      </div>
  );
}

function getFirstName(user: AccountUser | null) {
  const name =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  return name.split(/\s+/)[0];
}

function buildHomeMessage(state: HomeState) {
  if (!state.latestCheckIn) {
    return "Start with one honest check-in. See how close today feels to the life you already named.";
  }

  if (!state.todaysCheckIn) {
    return `Your last recorded state was ${state.latestCheckIn.beingScore.toFixed(
      1,
    )}/10. Measure today, notice the gap, then choose the next clean step.`;
  }

  if (!state.todaysJournal?.content.trim()) {
    return `Today is measured at ${state.todaysCheckIn.beingScore.toFixed(
      1,
    )}/10. Write a few honest lines to complete the day.`;
  }

  return `Today is complete. Let the pattern support your next decision.`;
}
