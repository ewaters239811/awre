"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Compass, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheckIns } from "@/lib/alignment";
import { buildBeingDashboardData } from "@/lib/being-analysis";
import { getJournalEntries } from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import type {
  BeingDashboardAnalysis,
  CheckInResult,
  JournalEntry,
  OnboardingProfile,
  PillarName,
} from "@/lib/types";

type CachedBeingAnalysis = {
  signature: string;
  analysis: BeingDashboardAnalysis;
  createdAt: string;
};

const ANALYSIS_CACHE_KEY = "clearpth.beingAnalysis.v1";

export function BeingDashboard() {
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [analysis, setAnalysis] = useState<BeingDashboardAnalysis | null>(null);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIns(getCheckIns());
      setJournalEntries(getJournalEntries());
    });
  }, []);

  const dashboard = useMemo(
    () => buildBeingDashboardData(checkIns, journalEntries),
    [checkIns, journalEntries],
  );

  useEffect(() => {
    if (checkIns.length === 0) {
      queueMicrotask(() => setAnalysis(dashboard.localAnalysis));
      return;
    }

    const onboardingProfile = getOnboardingProfile();
    const signature = buildAnalysisSignature(
      checkIns,
      journalEntries,
      onboardingProfile,
    );
    const cached = getCachedAnalysis(signature);

    if (cached) {
      queueMicrotask(() => {
        setAnalysis(cached.analysis);
        setIsReading(false);
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => setIsReading(true));

    fetch("/api/being-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIns,
        onboardingProfile,
        journalEntries: journalEntries.slice(0, 12).map((entry) => ({
          date: entry.date,
          content: entry.content,
        })),
        metrics: {
          latestScore: dashboard.latestScore,
          averageScore: dashboard.averageScore,
          trend: dashboard.trend,
          volatility: dashboard.volatility,
          integrationDebt: dashboard.integrationDebt,
          journalRhythm: dashboard.journalRhythm,
          weakestPillar: dashboard.weakestPillar,
          strongestPillar: dashboard.strongestPillar,
          pillarAverages: dashboard.pillarAverages,
        },
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { data?: BeingDashboardAnalysis }) => {
        const nextAnalysis = payload.data ?? dashboard.localAnalysis;
        setAnalysis(nextAnalysis);
        saveCachedAnalysis({
          signature,
          analysis: nextAnalysis,
          createdAt: new Date().toISOString(),
        });
      })
      .catch(() => setAnalysis(dashboard.localAnalysis))
      .finally(() => setIsReading(false));

    return () => controller.abort();
  }, [checkIns, dashboard, journalEntries]);

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <p className="clearpth-page-kicker">Pattern Intelligence</p>
        <h1 className="clearpth-page-title">What Is Happening Over Time</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          A living read of your current score, pillar balance, journal rhythm,
          integration debt, and the pattern shaping your state over time.
        </p>
      </section>

      {checkIns.length === 0 ? (
        <section className="aura-glass mx-auto mt-8 max-w-6xl rounded-lg p-6">
          <h2 className="font-serif text-3xl font-semibold">
            Your Being has not been measured yet.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Complete a check-in and a daily journal to unlock your patterns.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/check-in">Begin Check-In</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/ritual">Open Journal</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="aura-glass rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Current Being
                </p>
              </div>
              <div className="mt-6 flex items-end gap-3">
                <span className="font-serif text-8xl font-semibold leading-none text-primary">
                  {dashboard.latestScore?.toFixed(1) ?? "-"}
                </span>
                <span className="pb-3 text-xl text-muted-foreground">/ 10</span>
              </div>
              <div className="mt-6 grid gap-3">
                <PillarBar
                  label="Thinking"
                  value={dashboard.pillarAverages.Thinking}
                />
                <PillarBar
                  label="Willing"
                  value={dashboard.pillarAverages.Willing}
                />
                <PillarBar
                  label="Feeling"
                  value={dashboard.pillarAverages.Feeling}
                />
              </div>
              <div className="mt-6 rounded-md border border-primary/20 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">
                  Primary Signal
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {dashboard.strongestPillar} is your current support.
                  {dashboard.weakestPillar} is the point where the whole system
                  can become more coherent.
                </p>
              </div>
            </div>

            <div className="aura-glass rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Pattern Reading
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold">
                    {analysis?.archetype ?? "Reading your pattern"}
                  </h2>
                </div>
                {isReading ? (
                  <span className="rounded-md border border-border/55 bg-black/18 px-3 py-2 text-xs text-muted-foreground">
                    Reading
                  </span>
                ) : null}
              </div>
              <div className="mt-5 grid gap-4">
                <AnalysisBlock label="Summary" body={analysis?.summary} />
                <AnalysisBlock label="Root Cause" body={analysis?.rootCause} />
                <AnalysisBlock label="Hidden Debt" body={analysis?.hiddenDebt} />
                <AnalysisBlock
                  label="Leverage Point"
                  body={analysis?.leveragePoint}
                />
                <AnalysisBlock label="Next Practice" body={analysis?.nextPractice} />
              </div>
            </div>
          </section>

          <section className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.metrics.map((metric) => (
              <article key={metric.label} className="aura-glass rounded-lg p-5">
                <div className="flex items-center gap-3">
                  <MetricIcon label={metric.label} />
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">
                    {metric.label}
                  </p>
                </div>
                <p className="mt-3 font-serif text-4xl font-semibold">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {metric.detail}
                </p>
              </article>
            ))}
          </section>

          <section className="aura-glass mx-auto mt-8 max-w-6xl rounded-lg p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Score Over Time
                </p>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Recent check-ins, oldest to newest
              </p>
            </div>
            <div className="mt-6 flex min-h-48 items-end gap-2 overflow-x-auto pb-2">
              {dashboard.timeline.map((point, index) => (
                <div
                  key={`${point.date}-${index}`}
                  className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                  title={`${point.date}: ${point.score.toFixed(1)}`}
                >
                  <div
                    className="w-full rounded-t-md border border-primary/25 bg-primary/25"
                    style={{ height: `${Math.max(point.score * 10, 8)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {point.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function MetricIcon({ label }: { label: string }) {
  const className = "h-4 w-4 text-primary";

  if (label.toLowerCase().includes("trend")) {
    return <Activity className={className} aria-hidden />;
  }

  if (label.toLowerCase().includes("debt")) {
    return <Compass className={className} aria-hidden />;
  }

  return <Gauge className={className} aria-hidden />;
}

function PillarBar({ label, value }: { label: PillarName; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-primary">{value.toFixed(1)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-md bg-black/30">
        <div
          className="h-full rounded-md bg-primary"
          style={{ width: `${Math.min(value * 10, 100)}%` }}
        />
      </div>
    </div>
  );
}

function AnalysisBlock({
  label,
  body,
}: {
  label: string;
  body?: string;
}) {
  return (
    <article className="rounded-md border border-border/55 bg-black/18 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">{label}</p>
      <p className="mt-2 leading-7 text-muted-foreground">
        {body ?? "Reading the pattern..."}
      </p>
    </article>
  );
}

function buildAnalysisSignature(
  checkIns: CheckInResult[],
  journalEntries: JournalEntry[],
  onboardingProfile: OnboardingProfile | null,
) {
  const checkInSignal = checkIns
    .map((item) =>
      [
        item.id,
        item.createdAt,
        item.thinkingScore,
        item.willingScore,
        item.feelingScore,
        item.dominantThought,
        item.avoidedAction,
        item.currentFeeling,
        item.highestBeingChoice,
      ].join("|"),
    )
    .join("::");
  const journalSignal = journalEntries
    .slice(0, 12)
    .map((entry) =>
      [entry.id, entry.date, entry.updatedAt, entry.content.trim()].join("|"),
    )
    .join("::");
  const profileSignal = onboardingProfile
    ? [
        onboardingProfile.primaryGoal,
        onboardingProfile.currentChallenge,
        onboardingProfile.desiredState,
        onboardingProfile.practiceStyle,
        onboardingProfile.spiritualOpenness,
        onboardingProfile.commitmentLevel,
        onboardingProfile.guidanceTone,
        onboardingProfile.updatedAt,
      ].join("|")
    : "no-profile";

  return simpleHash(`${checkInSignal}--${journalSignal}--${profileSignal}`);
}

function getCachedAnalysis(signature: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(ANALYSIS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedBeingAnalysis;
    return cached.signature === signature ? cached : null;
  } catch {
    return null;
  }
}

function saveCachedAnalysis(cached: CachedBeingAnalysis) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // If storage is unavailable, the dashboard still works without caching.
  }
}

function simpleHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return String(hash >>> 0);
}
