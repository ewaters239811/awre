"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyFlow } from "@/components/daily-flow";
import { ManifestationFocus } from "@/components/manifestation-focus";
import { getCurrentAccount } from "@/lib/account-data";
import {
  CHECK_INS_CHANGED_EVENT,
  getCheckInDateKey,
  getCheckInForDate,
  getCheckIns,
} from "@/lib/alignment";
import {
  getJournalEntries,
  getJournalEntryForDate,
  JOURNAL_CHANGED_EVENT,
} from "@/lib/journal-storage";
import {
  MEDITATION_COMPLETED_EVENT,
  hasMeditationCompletionForDate,
} from "@/lib/meditation-storage";
import {
  getOnboardingProfile,
  ONBOARDING_CHANGED_EVENT,
} from "@/lib/onboarding-storage";
import { toCheckInDateKey } from "@/lib/date-key";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import { primaryManifestation } from "@/lib/manifestations";
import { HomeGapNote } from "@/components/home-gap-note";
import { buildHomeAlignmentContext } from "@/lib/home-alignment";
import type {
  CheckInResult,
  JournalEntry,
  OnboardingProfile,
} from "@/lib/types";

type AccountUser = {
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

type HomeState = {
  user: AccountUser | null;
  checkIns: CheckInResult[];
  journalEntries: JournalEntry[];
  latestCheckIn: CheckInResult | null;
  todaysCheckIn: CheckInResult | null;
  todaysJournal: JournalEntry | null;
  hasMeditatedToday: boolean;
  totalCheckIns: number;
  totalJournals: number;
  hasProfile: boolean;
  profile: OnboardingProfile | null;
};

const RETURN_TO_COVER_KEY = "clearpth.returnToCoverFromSetup";

export function HomeHero() {
  const router = useRouter();
  const checkInToday = useCurrentCheckInDateKey();
  const calendarToday = useCurrentDateKey();
  const [state, setState] = useState<HomeState>({
    user: null,
    checkIns: [],
    journalEntries: [],
    latestCheckIn: null,
    todaysCheckIn: null,
    todaysJournal: null,
    hasMeditatedToday: false,
    totalCheckIns: 0,
    totalJournals: 0,
    hasProfile: false,
    profile: null,
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
          const profile = getOnboardingProfile();
          const hasProfile = Boolean(profile);
          const checkIns = getCheckIns();
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
            checkIns,
            journalEntries: getJournalEntries(),
            latestCheckIn: checkIns[0] ?? null,
            todaysCheckIn: getCheckInForDate(checkInToday),
            todaysJournal: getJournalEntryForDate(calendarToday),
            hasMeditatedToday: hasMeditationCompletionForDate(calendarToday),
            totalCheckIns: checkIns.length,
            totalJournals: getJournalEntries().length,
            hasProfile,
            profile,
          });
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    queueMicrotask(refreshHomeState);
    window.addEventListener(CHECK_INS_CHANGED_EVENT, refreshHomeState);
    window.addEventListener(MEDITATION_COMPLETED_EVENT, refreshHomeState);
    window.addEventListener(ONBOARDING_CHANGED_EVENT, refreshHomeState);
    window.addEventListener(JOURNAL_CHANGED_EVENT, refreshHomeState);
    window.addEventListener("clearpth:account-data-synced", refreshHomeState);

    return () => {
      cancelled = true;
      window.removeEventListener(CHECK_INS_CHANGED_EVENT, refreshHomeState);
      window.removeEventListener(MEDITATION_COMPLETED_EVENT, refreshHomeState);
      window.removeEventListener(ONBOARDING_CHANGED_EVENT, refreshHomeState);
      window.removeEventListener(JOURNAL_CHANGED_EVENT, refreshHomeState);
      window.removeEventListener(
        "clearpth:account-data-synced",
        refreshHomeState,
      );
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

function PublicHomeHero({ startHref = "/login" }: { startHref?: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-4xl flex-col items-center justify-center text-center md:min-h-[calc(100vh-5rem)]">
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
        <h1 className="aura-gradient-text relative animate-cover-float font-serif text-[4.4rem] font-semibold leading-[0.9] drop-shadow-[0_0_34px_hsl(var(--primary)/0.24)] sm:text-8xl lg:text-[8.5rem]">
          ClearPth
        </h1>
      </div>
      <div className="aura-luxury-line mx-auto mt-7 w-40 max-w-lg sm:mt-9 sm:w-64" />
      <p className="mt-7 max-w-xl text-[1.35rem] leading-8 text-foreground/88 sm:mt-9 sm:text-3xl sm:leading-10">
        Become the person who can hold the life you want.
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

export function PersonalHomeHero({ state }: { state: HomeState }) {
  const firstName = useMemo(() => getFirstName(state.user), [state.user]);
  const hasCheckedInToday = Boolean(state.todaysCheckIn);
  const hasFocus = Boolean(primaryManifestation(state.profile));
  const latest = state.todaysCheckIn ?? state.latestCheckIn;
  const context = buildHomeAlignmentContext(
    state.checkIns,
    state.journalEntries,
    state.profile,
  );
  const streak = buildStreakStats(state.checkIns, state.todaysCheckIn);

  return (
    <div className="clearpth-home mx-auto w-full max-w-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 break-words text-lg font-medium text-foreground/85 sm:text-xl">
          Welcome back, {firstName}.
        </h1>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-achievement" aria-hidden />
          {streak.currentStreak}-day streak
        </span>
      </header>

      <section
        className="pt-8 text-center sm:pt-10"
        aria-label="Your inner alignment"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Inner Alignment
        </p>
        <CurrentStateRing score={latest?.beingScore} />
        <p className="mt-2 text-xs text-muted-foreground">
          {latest
            ? hasCheckedInToday
              ? "Today's check-in"
              : `Last check-in · ${new Date(latest.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : "Your first check-in starts here"}
        </p>
        <HomeGapNote context={context} />
        <Button
          asChild
          size="lg"
          className="mt-7 w-full sm:mx-auto sm:max-w-sm"
        >
          <Link
            href={
              !hasFocus
                ? "/manifestations"
                : hasCheckedInToday
                  ? "/review"
                  : "/check-in"
            }
          >
            {!hasFocus
              ? "Choose Your Desired Reality"
              : hasCheckedInToday
                ? "View Today's Check-In"
                : "Check In"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </section>

      <div className="mt-9 sm:mt-10">
        <DailyFlow
          checkedIn={hasCheckedInToday}
          readToday={Boolean(state.todaysCheckIn?.readAt)}
          meditated={state.hasMeditatedToday}
        />
      </div>
      <details className="mt-6 border-t border-border/40 pt-3">
        <summary className="cursor-pointer py-3 text-sm text-muted-foreground">
          Your desired reality
        </summary>
        <ManifestationFocus />
      </details>
    </div>
  );
}

function CurrentStateRing({ score }: { score?: number }) {
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const circumference = 2 * Math.PI * 112;
  const progress = hasScore ? Math.max(0, Math.min(score / 10, 1)) : 0;

  return (
    <div
      className="relative mx-auto mt-5 flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72"
      role="img"
      aria-label={
        hasScore
          ? `Inner alignment: ${score.toFixed(1)} out of 10`
          : "Inner alignment not yet measured"
      }
    >
      <svg
        viewBox="0 0 256 256"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="128"
          cy="128"
          r="112"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/15"
        />
        <circle
          cx="128"
          cy="128"
          r="112"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ "--alignment-full": circumference } as CSSProperties}
          className="clearpth-score-progress text-primary transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div>
        <p className="clearpth-score-value font-serif text-7xl font-semibold leading-none text-foreground sm:text-8xl">
          {hasScore ? score.toFixed(1) : "-"}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">out of 10</p>
      </div>
    </div>
  );
}

function buildStreakStats(
  checkIns: CheckInResult[],
  todaysCheckIn: CheckInResult | null,
) {
  const dates = new Set(checkIns.map((item) => getCheckInDateKey(item)));
  const todayKey = todaysCheckIn
    ? getCheckInDateKey(todaysCheckIn)
    : toCheckInDateKey(new Date());
  const checkedInToday = Boolean(todaysCheckIn) || dates.has(todayKey);
  const cursor = new Date(`${todayKey}T12:00:00`);
  let currentStreak = 0;

  if (!checkedInToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dates.has(toCheckInDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    currentStreak,
    checkedInToday,
  };
}

function getFirstName(user: AccountUser | null) {
  const name =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  return name.split(/\s+/)[0];
}
