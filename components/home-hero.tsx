"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Headphones } from "lucide-react";
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
import type {
  CheckInResult,
  JournalEntry,
  OnboardingProfile,
  PillarName,
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
        <h1 className="aura-gradient-text relative animate-cover-float font-serif text-[4.4rem] font-semibold leading-[0.9] drop-shadow-[0_0_34px_rgba(166,187,154,0.24)] sm:text-8xl lg:text-[8.5rem]">
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

function PersonalHomeHero({ state }: { state: HomeState }) {
  const firstName = useMemo(() => getFirstName(state.user), [state.user]);
  const hasCheckedInToday = Boolean(state.todaysCheckIn);
  const hasJournalToday = Boolean(state.todaysJournal?.content.trim());
  const hasMeditatedToday = state.hasMeditatedToday;
  const hasFocus = Boolean(primaryManifestation(state.profile));
  const nextHref = !hasFocus
    ? "/manifestations"
    : !hasCheckedInToday
      ? "/check-in"
      : !state.todaysCheckIn?.readAt
        ? "/review"
        : !hasJournalToday
          ? "/ritual"
          : !hasMeditatedToday
            ? "/tune-in"
            : "/review";
  const nextLabel = !hasFocus
    ? "Create Your Desired Reality"
    : !hasCheckedInToday
      ? "Check In"
      : !state.todaysCheckIn?.readAt
        ? "Read Today's Reflection"
        : !hasJournalToday
          ? "Write Current State"
          : !hasMeditatedToday
            ? "Meditate"
            : "Review Today";
  const currentScore =
    state.todaysCheckIn?.beingScore ?? state.latestCheckIn?.beingScore;
  const alignmentNote = buildAlignmentNote(state);
  const streak = buildStreakStats(state.checkIns, state.todaysCheckIn);

  return (
    <div className="relative max-w-3xl pt-2 md:pt-0">
      <div className="pointer-events-none absolute -left-12 top-2 hidden h-20 w-20 rounded-full bg-primary/10 blur-2xl sm:block" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:gap-8">
        <div>
          <p className="text-base font-light leading-none text-foreground/64 sm:text-xl">
            Welcome back,
          </p>
          <h1 className="mt-2 max-w-2xl break-words font-serif text-[2.5rem] font-semibold leading-tight text-foreground sm:text-5xl">
            {firstName}.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/78 sm:text-base">
            {buildHomeMessage(state)}
          </p>
          <StreakRhythm
            streak={streak.currentStreak}
            checkedInToday={streak.checkedInToday}
          />
        </div>
        <CurrentStateRing score={currentScore} />
      </div>

      <ManifestationFocus />
      <div className="mt-6">
        <DailyFlow
          checkedIn={hasCheckedInToday}
          readToday={Boolean(state.todaysCheckIn?.readAt)}
          journaled={hasJournalToday}
        />
      </div>
      <Button asChild size="lg" className="mt-5 w-full sm:max-w-xl">
        <Link href={nextHref}>
          {nextLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
      <section className="mt-10 sm:mt-12 sm:max-w-2xl">
        <p className="font-serif text-[2.55rem] font-semibold uppercase leading-none tracking-[0.14em] text-foreground sm:text-5xl">
          Alignment Note
        </p>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {alignmentNote}
        </p>
      </section>

      <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2">
        <HomeMiniLink
          href="/tune-in"
          icon={<Headphones className="h-4 w-4" aria-hidden />}
          label="Meditation"
          body="Listen to today's session"
        />
        <HomeMiniLink
          href="/dashboard"
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          label="Progress"
          body="See what keeps showing up"
        />
      </div>
    </div>
  );
}

function CurrentStateRing({ score }: { score?: number }) {
  const label = typeof score === "number" ? score.toFixed(1) : "-";

  return (
    <div className="clearpth-orb mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full sm:h-36 sm:w-36">
      <div className="relative z-10 text-center">
        <p className="font-serif text-3xl font-semibold leading-none text-primary drop-shadow-[0_0_20px_rgba(166,187,154,0.36)] sm:text-5xl">
          {label}
        </p>
        <p className="mt-2 text-[9px] uppercase tracking-normal text-foreground/66">
          Inner Alignment
        </p>
      </div>
    </div>
  );
}

function StreakRhythm({
  streak,
  checkedInToday,
}: {
  streak: number;
  checkedInToday: boolean;
}) {
  return (
    <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-primary/14 bg-card/28 px-4 py-2.5 text-sm text-foreground/84 shadow-[inset_0_1px_0_rgba(244,239,228,0.05)] backdrop-blur-xl">
      <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_18px_rgba(166,187,154,0.34)]" />
      <span className="font-medium text-foreground">{streak}-day streak</span>
      <span className="h-1 w-1 rounded-full bg-muted-foreground/45" />
      <span className="truncate text-muted-foreground">
        {checkedInToday
          ? "Rhythm kept today."
          : "Check in to keep your rhythm."}
      </span>
    </div>
  );
}

function buildAlignmentNote(state: HomeState) {
  const historicalPattern = getHistoricalGapPattern(state.checkIns);

  if (!historicalPattern) {
    return "The gap is still unmeasured because ClearPth needs one honest check-in to compare your current state with your desired reality.";
  }

  if (historicalPattern.averageBeing >= 8.5) {
    return "Your history shows the gap is narrowing; the work now is protecting the consistency that lets you hold your desired reality.";
  }

  return getHistoricalGapReason(historicalPattern.weakestPillar);
}

function getHistoricalGapReason(weakest: PillarName) {
  if (weakest === "Thinking") {
    return "The deeper gap is perception: your mind still rehearses the old reality more than it believes your desired reality is available.";
  }

  if (weakest === "Doing") {
    return "The deeper gap is consistency: your history shows your actions have not repeated the identity your desired reality requires.";
  }

  return "The deeper gap is emotional loyalty: your state still returns to what is familiar instead of feeling at home in your desired reality.";
}

function getHistoricalGapPattern(checkIns: CheckInResult[]) {
  if (checkIns.length === 0) return null;

  const totals = checkIns.reduce(
    (current, checkIn) => ({
      thinking: current.thinking + checkIn.thinkingScore,
      doing: current.doing + checkIn.willingScore,
      feeling: current.feeling + checkIn.feelingScore,
      being: current.being + checkIn.beingScore,
    }),
    { thinking: 0, doing: 0, feeling: 0, being: 0 },
  );

  const count = checkIns.length;
  const averages = [
    { pillar: "Thinking" as const, score: totals.thinking / count },
    { pillar: "Doing" as const, score: totals.doing / count },
    { pillar: "Feeling" as const, score: totals.feeling / count },
  ];

  return {
    averageBeing: totals.being / count,
    weakestPillar: averages.sort((a, b) => a.score - b.score)[0].pillar,
  };
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
  if (!primaryManifestation(state.profile))
    return "Choose what you want to create next.";

  if (!state.latestCheckIn) {
    return "A few honest minutes for the life you want.";
  }

  if (!state.todaysCheckIn) {
    return "A fresh day. Start with where you are now.";
  }

  if (!state.todaysJournal?.content.trim()) {
    return state.todaysCheckIn.readAt
      ? "Give today's reflection a voice."
      : "Your reflection is ready.";
  }

  if (!state.hasMeditatedToday) {
    return "Your daily path is complete. Tune in whenever you need.";
  }

  return "Your daily path is complete.";
}
