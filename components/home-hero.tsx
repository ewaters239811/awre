"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { getOnboardingProfile } from "@/lib/onboarding-storage";
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
  hasProfile: boolean;
};

export function HomeHero() {
  const router = useRouter();
  const checkInToday = useCurrentCheckInDateKey();
  const calendarToday = useCurrentDateKey();
  const [state, setState] = useState<HomeState>({
    user: null,
    latestCheckIn: null,
    todaysCheckIn: null,
    todaysJournal: null,
    totalCheckIns: 0,
    totalJournals: 0,
    hasProfile: false,
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
            hasProfile: Boolean(getOnboardingProfile()),
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

  if (!state.hasProfile) {
    queueMicrotask(() => router.replace("/onboarding"));
    return (
      <div className="max-w-3xl pt-2 md:pt-0">
        <p className="clearpth-page-kicker">Setup</p>
        <h1 className="clearpth-page-title">Preparing your path.</h1>
      </div>
    );
  }

  return <PersonalHomeHero state={state} />;
}

function PublicHomeHero() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] max-w-4xl flex-col items-center justify-center text-center md:min-h-[calc(100vh-5rem)]">
      <span className="mb-7 flex h-16 w-16 animate-cover-float items-center justify-center rounded-2xl border border-primary/22 bg-card/30 text-foreground shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:h-20 sm:w-20">
        <svg
          viewBox="0 0 36 36"
          className="h-9 w-9 sm:h-11 sm:w-11"
          fill="none"
          aria-hidden
        >
          <path
            d="M18 4 29 18 18 32 7 18 18 4Z"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M12 21.5c2.1 2.6 5.6 3.8 9 2.9 3.5-.9 6-3.9 6.1-7.3"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M24 14.5c-2-2.2-5.1-3.1-8.1-2.3-3.5.9-6 3.9-6.1 7.3"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.55"
          />
          <circle cx="18" cy="18" r="2.2" fill="currentColor" />
        </svg>
      </span>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-[-16%] top-1/2 h-16 -translate-y-1/2 rounded-full bg-primary/18 blur-3xl sm:h-24" />
        <h1 className="relative animate-cover-float font-serif text-[4.7rem] font-semibold leading-[0.88] text-foreground drop-shadow-[0_0_32px_rgba(191,164,106,0.26)] sm:text-8xl lg:text-[8.5rem]">
          ClearPth
        </h1>
      </div>
      <div className="aura-luxury-line mx-auto mt-7 w-40 max-w-lg sm:mt-9 sm:w-64" />
      <p className="mt-7 max-w-xl text-xl leading-8 text-foreground/88 sm:mt-9 sm:text-3xl sm:leading-10">
        Become aligned with the life you want.
      </p>
      <div className="mt-10 grid w-full max-w-sm gap-4 sm:mt-12 sm:max-w-xs">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/login">
            Start Aligning
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
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
