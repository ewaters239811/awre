"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, NotebookPen, Sparkles } from "lucide-react";
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
    <div className="max-w-3xl">
      <p className="mb-4 text-xs uppercase tracking-[0.24em] text-primary sm:text-sm sm:tracking-[0.28em]">
        ClearPth
      </p>
      <h1 className="font-serif text-4xl font-semibold leading-[1.02] text-foreground sm:text-7xl lg:text-8xl">
        What do you want?
      </h1>
      <div className="aura-luxury-line mt-6 max-w-lg" />
      <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/86 sm:mt-6 sm:text-2xl sm:leading-9">
        Say it plainly. ClearPth helps unpack the thoughts, feelings, and
        avoided actions around it, then turns that desire into a clearer state
        and next step.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/onboarding">
          Answer The Question
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
      <div className="mt-6 flex flex-wrap gap-2">
        {["answer one question", "unpack the pattern", "choose the next step"].map(
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
    <div className="max-w-3xl">
      <p className="mb-4 text-xs uppercase tracking-[0.24em] text-primary sm:text-sm sm:tracking-[0.28em]">
        Welcome Back
      </p>
      <h1 className="font-serif text-4xl font-semibold leading-[1.04] text-foreground sm:text-6xl lg:text-7xl">
        Hi {firstName}. Good to see you.
      </h1>
      <div className="aura-luxury-line mt-6 max-w-lg" />
      <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/86 sm:mt-6 sm:text-2xl sm:leading-9">
        {buildHomeMessage(state)}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <PersonalStat
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          label="Last score"
          value={
            state.latestCheckIn
              ? state.latestCheckIn.beingScore.toFixed(1)
              : "Open"
          }
        />
        <PersonalStat
          icon={<CalendarCheck className="h-4 w-4" aria-hidden />}
          label="Today"
          value={hasCheckedInToday ? "Checked in" : "Ready"}
        />
        <PersonalStat
          icon={<NotebookPen className="h-4 w-4" aria-hidden />}
          label="Journal"
          value={hasJournalToday ? "Written" : "Open"}
        />
      </div>

      <div className="mt-5">
        <DailyFlow
          checkedIn={hasCheckedInToday}
          readToday={hasCheckedInToday}
          journaled={hasJournalToday}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={nextHref}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/dashboard">See Patterns</Link>
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {["state", "journal", "next move"].map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function PersonalStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-md border border-border/70 bg-card/55 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-lg font-medium text-foreground">{value}</p>
    </article>
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
    return "No pressure. Start with one honest check-in and let today become a little clearer.";
  }

  if (!state.todaysCheckIn) {
    return `Your last recorded state was ${state.latestCheckIn.beingScore.toFixed(
      1,
    )}/10. Come in gently today: notice what is true, then choose the next clean step.`;
  }

  if (!state.todaysJournal?.content.trim()) {
    return `Today is already measured at ${state.todaysCheckIn.beingScore.toFixed(
      1,
    )}/10. A few honest lines would give the day more texture.`;
  }

  return `You have ${state.totalCheckIns} check-ins and ${state.totalJournals} journal entries in your record. Today has a shape now; let it support the next decision.`;
}
