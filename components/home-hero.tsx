"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Headphones, Sparkles } from "lucide-react";
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

const RETURN_TO_COVER_KEY = "clearpth.returnToCoverFromSetup";

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
  const [showCoverInsteadOfSetup, setShowCoverInsteadOfSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshHomeState = () => {
      let shouldShowCover = false;
      try {
        shouldShowCover =
          sessionStorage.getItem(RETURN_TO_COVER_KEY) === "true";
      } catch {
        shouldShowCover = false;
      }

      getCurrentAccount()
        .then((user) => {
          if (cancelled) return;
          const hasProfile = Boolean(getOnboardingProfile());
          if (hasProfile) {
            try {
              sessionStorage.removeItem(RETURN_TO_COVER_KEY);
            } catch {
              // Session storage can be unavailable in some privacy modes.
            }
          }
          setShowCoverInsteadOfSetup(shouldShowCover);
          setState({
            user,
            latestCheckIn: getLatestCheckIn(),
            todaysCheckIn: getCheckInForDate(checkInToday),
            todaysJournal: getJournalEntryForDate(calendarToday),
            totalCheckIns: getCheckIns().length,
            totalJournals: getJournalEntries().length,
            hasProfile,
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

  if (!state.hasProfile && showCoverInsteadOfSetup) {
    return <PublicHomeHero startHref="/onboarding" />;
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

function PublicHomeHero({
  startHref = "/login",
}: {
  startHref?: string;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] max-w-4xl flex-col items-center justify-center text-center md:min-h-[calc(100vh-5rem)]">
      <span className="mb-8 flex h-16 w-16 animate-cover-float items-center justify-center rounded-[1.35rem] border border-primary/18 bg-card/22 text-foreground shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:h-20 sm:w-20 sm:rounded-3xl">
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
        <div className="pointer-events-none absolute inset-x-[-18%] top-1/2 h-20 -translate-y-1/2 rounded-full bg-primary/16 blur-3xl sm:h-28" />
        <h1 className="aura-gradient-text relative animate-cover-float font-serif text-[4.4rem] font-semibold leading-[0.9] drop-shadow-[0_0_34px_rgba(216,190,132,0.22)] sm:text-8xl lg:text-[8.5rem]">
          ClearPth
        </h1>
      </div>
      <div className="aura-luxury-line mx-auto mt-7 w-40 max-w-lg sm:mt-9 sm:w-64" />
      <p className="mt-7 max-w-xl text-[1.35rem] leading-8 text-foreground/88 sm:mt-9 sm:text-3xl sm:leading-10">
        Become aligned with the life you want.
      </p>
      <div className="mt-10 grid w-full max-w-sm gap-4 sm:mt-12 sm:max-w-xs">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={startHref}>
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
    : "Reveal Today's Gap";

  return (
    <div className="max-w-3xl pt-2 md:pt-0">
      <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-primary sm:mb-4 sm:text-sm sm:tracking-[0.24em]">
        Welcome Back
      </p>
      <h1 className="max-w-2xl font-serif text-[2.5rem] font-semibold leading-[1.04] text-foreground sm:text-6xl lg:text-7xl">
        Hi {firstName}. Align with your desired reality.
      </h1>
      <div className="aura-luxury-line mt-5 max-w-lg sm:mt-6" />
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-foreground/86 sm:mt-6 sm:text-2xl sm:leading-9">
        {buildHomeMessage(state)}
      </p>

      <div className="mt-7 rounded-[1.55rem] border border-primary/24 bg-[linear-gradient(135deg,rgba(216,190,132,0.14),rgba(90,140,118,0.08))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:mt-8 sm:max-w-xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/28 bg-background/36 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
              Today Unlocks
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/88">
              Check in to see where to close the gap between the current you
              and the desired reality you.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="mt-5 w-full">
          <Link href={nextHref}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="mt-6 rounded-[1.35rem] border border-border/42 bg-card/24 px-4 py-3.5 sm:mt-7 sm:max-w-xl sm:rounded-xl">
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

      <div className="mt-5 grid gap-3 sm:max-w-xl sm:grid-cols-2">
        <HomeMiniLink
          href="/tune-in"
          icon={<Headphones className="h-4 w-4" aria-hidden />}
          label="Tune In"
          body="Play today's session"
        />
        <HomeMiniLink
          href="/dashboard"
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          label="Patterns"
          body="See what keeps repeating"
        />
      </div>
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

function HomeMiniLink({
  href,
  icon,
  label,
  body,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.15rem] border border-border/42 bg-card/20 p-3.5 transition hover:-translate-y-0.5 hover:border-primary/28 hover:bg-card/34"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
        {body}
      </span>
    </Link>
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
    return "Check in to see where you need to close the gap between the current you and the desired reality you.";
  }

  if (!state.todaysCheckIn) {
    return `Your last recorded state was ${state.latestCheckIn.beingScore.toFixed(
      1,
    )}/10. Check in now to see where today's version of you is aligned, and where the gap needs attention.`;
  }

  if (!state.todaysJournal?.content.trim()) {
    return `Today is measured at ${state.todaysCheckIn.beingScore.toFixed(
      1,
    )}/10. Write a few honest lines to complete the day.`;
  }

  return `Today is complete. Let the pattern support your next decision.`;
}
