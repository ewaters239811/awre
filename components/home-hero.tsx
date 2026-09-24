"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  MEDITATION_COMPLETED_EVENT,
  hasMeditationCompletionForDate,
} from "@/lib/meditation-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { CheckInResult, JournalEntry, OnboardingProfile } from "@/lib/types";

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
            hasMeditatedToday: hasMeditationCompletionForDate(calendarToday),
            totalCheckIns: getCheckIns().length,
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

    return () => {
      cancelled = true;
      window.removeEventListener(CHECK_INS_CHANGED_EVENT, refreshHomeState);
      window.removeEventListener(MEDITATION_COMPLETED_EVENT, refreshHomeState);
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
        <h1 className="aura-gradient-text relative animate-cover-float font-serif text-[4.4rem] font-semibold leading-[0.9] drop-shadow-[0_0_34px_rgba(166,187,154,0.24)] sm:text-8xl lg:text-[8.5rem]">
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
  const hasMeditatedToday = state.hasMeditatedToday;
  const nextHref = !hasCheckedInToday
    ? "/check-in"
    : !hasJournalToday
      ? "/ritual"
      : !hasMeditatedToday
        ? "/tune-in"
        : "/review";
  const nextLabel = !hasCheckedInToday
    ? "Check In"
    : !hasJournalToday
      ? "Write Current State"
      : !hasMeditatedToday
        ? "Meditate"
        : "Review Today";
  const currentScore =
    state.todaysCheckIn?.beingScore ?? state.latestCheckIn?.beingScore;
  const dailyInsight = buildDailyInsight(state);

  return (
    <div className="relative max-w-3xl pt-2 md:pt-0">
      <div className="pointer-events-none absolute -left-12 top-2 hidden h-20 w-20 rounded-full bg-primary/10 blur-2xl sm:block" />
      <div className="grid items-start gap-7 sm:grid-cols-[1fr_auto] sm:gap-8">
        <div>
          <p className="text-[1.35rem] font-light leading-none text-foreground/64 sm:text-3xl">
            Welcome back,
          </p>
          <h1 className="mt-2 max-w-2xl font-serif text-[4rem] font-semibold leading-[0.9] text-foreground sm:text-7xl lg:text-8xl">
            {firstName}.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-foreground/78 sm:mt-8 sm:text-xl sm:leading-8">
            {buildHomeMessage(state)}
          </p>
        </div>
        <CurrentStateRing score={currentScore} />
      </div>

      <section className="mt-8 sm:mt-10 sm:max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/72">
          Today
        </p>
        <div className="mt-4 grid gap-3">
          <HomeTask
            done={hasCheckedInToday}
            label="Check in"
            href="/check-in"
          />
          <HomeTask
            done={hasJournalToday}
            label="Write about your current state"
            href="/ritual"
          />
          <HomeTask
            done={hasMeditatedToday}
            label="Meditate"
            href="/tune-in"
          />
        </div>
        <Button asChild size="lg" className="mt-5 w-full">
          <Link href={nextHref}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </section>

      <section className="mt-10 sm:mt-12 sm:max-w-2xl">
        <p className="font-serif text-[2.55rem] font-semibold uppercase leading-none tracking-[0.14em] text-foreground sm:text-5xl">
          Daily Insight
        </p>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {dailyInsight}
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
  const label = typeof score === "number" ? score.toFixed(1) : "0";

  return (
    <div className="clearpth-orb mx-auto flex h-36 w-36 shrink-0 items-center justify-center rounded-full sm:h-44 sm:w-44">
      <div className="relative z-10 text-center">
        <p className="font-serif text-5xl font-semibold leading-none text-primary drop-shadow-[0_0_20px_rgba(166,187,154,0.36)] sm:text-6xl">
          {label}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-foreground/66">
          Current State
        </p>
      </div>
    </div>
  );
}

function HomeTask({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center gap-4 rounded-full border border-primary/14 bg-card/30 px-5 py-3 text-foreground/82 shadow-[inset_0_1px_0_rgba(244,239,228,0.05)] backdrop-blur-xl transition hover:border-primary/30 hover:bg-card/44"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/16 bg-background/20 text-primary">
        {done ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        ) : (
          <Circle className="h-4 w-4 opacity-45" aria-hidden />
        )}
      </span>
      <span className="text-[1rem] leading-6 text-foreground/82 transition group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

function buildDailyInsight(state: HomeState) {
  const desiredReality = getDesiredRealityLine(state.profile).toLowerCase();

  if (!state.latestCheckIn) {
    return `Start by measuring your state against ${desiredReality}. The app becomes useful the moment you give it one honest signal.`;
  }

  if (!state.todaysCheckIn) {
    return `Your last state was ${state.latestCheckIn.beingScore.toFixed(
      1,
    )}/10. Today is not a repeat unless you move through it unconsciously.`;
  }

  if (!state.todaysJournal?.content.trim()) {
    return `You have measured the day. Now name the pattern in a few honest lines so it does not stay vague.`;
  }

  if (!state.hasMeditatedToday) {
    return `Your current state is named. Now let the body catch up with what the mind has seen.`;
  }

  return `The day has a signal now. Let the next action prove the version of you that your desired life requires.`;
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
  const desiredReality = getDesiredRealityLine(state.profile).toLowerCase();

  if (!state.latestCheckIn) {
    return `Check in to see where you are today with ${desiredReality}.`;
  }

  if (!state.todaysCheckIn) {
    return `Your last recorded state was ${state.latestCheckIn.beingScore.toFixed(
      1,
    )}/10. Check in now to see where you stand today and what to focus on next.`;
  }

  if (!state.todaysJournal?.content.trim()) {
    return `Today is measured at ${state.todaysCheckIn.beingScore.toFixed(
      1,
    )}/10. Write a few honest lines to complete the day.`;
  }

  if (!state.hasMeditatedToday) {
    return "Your check-in and journal are done. Meditate to settle the state into your body.";
  }

  return `Today is complete. Let the pattern support your next decision.`;
}

function getDesiredRealityLine(profile: OnboardingProfile | null) {
  const primaryGoal = profile?.primaryGoal.trim();

  return primaryGoal || "the life you want";
}
