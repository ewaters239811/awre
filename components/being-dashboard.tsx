"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Compass,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryCalendar } from "@/components/history-calendar";
import { getCheckInDateKey, getCheckIns } from "@/lib/alignment";
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

type GapInsight = {
  currentState: string;
  desiredState: string;
  bridgePillar: PillarName | null;
  supportPillar: PillarName | null;
  distanceLabel: string;
  progress: number;
  missingBridge: string;
  nextMove: string;
};

const ANALYSIS_CACHE_KEY = "clearpth.beingAnalysis.v1";

export function BeingDashboard() {
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [onboardingProfile, setOnboardingProfile] =
    useState<OnboardingProfile | null>(null);
  const [analysis, setAnalysis] = useState<BeingDashboardAnalysis | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInResult | null>(
    null,
  );

  useEffect(() => {
    queueMicrotask(() => {
      const savedCheckIns = getCheckIns();
      setCheckIns(savedCheckIns);
      setSelectedCheckIn(savedCheckIns[0] ?? null);
      setJournalEntries(getJournalEntries());
      setOnboardingProfile(getOnboardingProfile());
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
      .then((payload: { enabled?: boolean; data?: BeingDashboardAnalysis }) => {
        const nextAnalysis = payload.data ?? dashboard.localAnalysis;
        setAnalysis(nextAnalysis);

        if (payload.enabled !== false && payload.data) {
          saveCachedAnalysis({
            signature,
            analysis: nextAnalysis,
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch(() => setAnalysis(dashboard.localAnalysis))
      .finally(() => setIsReading(false));

    return () => controller.abort();
  }, [checkIns, dashboard, journalEntries, onboardingProfile]);

  const gapInsight = useMemo(
    () => buildGapInsight(dashboard, onboardingProfile),
    [dashboard, onboardingProfile],
  );

  return (
    <main className="container py-6 md:py-12">
      <section className="mx-auto max-w-6xl">
        <p className="clearpth-page-kicker">Patterns</p>
        <h1 className="clearpth-page-title">What Keeps Repeating?</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:mt-4 md:text-base">
          The point is not more data. The point is seeing the pattern clearly
          enough to move differently.
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
              <Link href="/check-in">Begin Check In</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/ritual">Open Journal</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-6 grid max-w-6xl gap-5 lg:mt-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="aura-glass rounded-2xl p-5 md:rounded-lg md:p-6">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  Current Score
                </p>
              </div>
              <div className="mt-5 flex items-end gap-3 md:mt-6">
                <span className="font-serif text-6xl font-semibold leading-none text-primary sm:text-8xl">
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
              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 p-4 md:rounded-md">
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.2em]">
                  Primary Signal
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {dashboard.strongestPillar} is your current support.
                  {dashboard.weakestPillar} is the point where the whole system
                  can become more coherent.
                </p>
              </div>
            </div>

            <div className="aura-glass rounded-2xl p-5 md:rounded-lg md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                    Pattern Reading
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight">
                    {analysis?.archetype ?? "Reading your pattern"}
                  </h2>
                </div>
                {isReading ? (
                  <span className="rounded-md border border-border/55 bg-card/55 px-3 py-2 text-xs text-muted-foreground">
                    Reading
                  </span>
                ) : null}
              </div>
              <div className="mt-5 grid gap-3 md:gap-4">
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

          <GapInsightCard insight={gapInsight} />

          <section className="mx-auto mt-8 grid max-w-6xl gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {dashboard.metrics.map((metric) => (
              <article key={metric.label} className="rounded-2xl border border-border/65 bg-card/35 p-4 md:aura-glass md:rounded-lg md:p-5">
                <div className="flex items-center gap-3">
                  <MetricIcon label={metric.label} />
                  <p className="text-[10px] uppercase tracking-[0.14em] text-primary md:text-xs md:tracking-[0.22em]">
                    {metric.label}
                  </p>
                </div>
                <p className="mt-2 font-serif text-3xl font-semibold md:mt-3 md:text-4xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {metric.detail}
                </p>
              </article>
            ))}
          </section>

          <section className="mx-auto mt-8 max-w-6xl rounded-2xl border border-border/65 bg-card/35 p-4 md:aura-glass md:rounded-lg md:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  Score Over Time
                </p>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Recent check-ins, oldest to newest
              </p>
            </div>
            <ScoreTrendChart timeline={dashboard.timeline} />
          </section>

          <section className="mx-auto mt-8 max-w-6xl">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  Calendar
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight">
                  Your Recorded Days
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Data below, meaning above.
              </p>
            </div>
            <HistoryCalendar
              items={checkIns}
              selectedId={selectedCheckIn?.id}
              onSelect={setSelectedCheckIn}
            />
            <SelectedPatternDay item={selectedCheckIn} />
            <RecentPatternRecords items={checkIns} />
          </section>
        </>
      )}
    </main>
  );
}

function SelectedPatternDay({ item }: { item: CheckInResult | null }) {
  if (!item) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border/65 bg-card/35 p-4 md:aura-glass md:rounded-lg md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
              Selected Day
            </p>
          </div>
          <h2 className="mt-3 font-serif text-3xl font-semibold">
            {formatDateKey(getCheckInDateKey(item))}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {item.stateLabel}
          </p>
        </div>
        <Button asChild>
          <Link href={`/results?id=${item.id}`}>View Detail</Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Score" value={item.beingScore.toFixed(1)} />
        <MiniStat label="Thinking" value={String(item.thinkingScore)} />
        <MiniStat label="Willing" value={String(item.willingScore)} />
        <MiniStat label="Feeling" value={String(item.feelingScore)} />
        <MiniStat label="Pattern" value={item.weakestPillar} />
      </div>
    </section>
  );
}

function RecentPatternRecords({ items }: { items: CheckInResult[] }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
            Recent Records
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">
            The Raw Signal
          </h2>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {items.length} total check-in{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {items.slice(0, 8).map((item) => (
          <article key={item.id} className="rounded-2xl border border-border/65 bg-card/35 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {formatDateKey(getCheckInDateKey(item))}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.stateLabel}
                </p>
              </div>
              <p className="font-serif text-3xl font-semibold">
                {item.beingScore.toFixed(1)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Think" value={String(item.thinkingScore)} />
              <MiniStat label="Act" value={String(item.willingScore)} />
              <MiniStat label="Feel" value={String(item.feelingScore)} />
            </div>
          </article>
        ))}
      </div>

      <div className="aura-glass mt-5 hidden overflow-hidden rounded-lg border border-border md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-accent/35 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Thinking</th>
                <th className="px-4 py-3 font-medium">Willing</th>
                <th className="px-4 py-3 font-medium">Feeling</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-border/55 transition hover:bg-accent/25"
                >
                  <td className="px-4 py-4">
                    {formatDateKey(getCheckInDateKey(item))}
                  </td>
                  <td className="px-4 py-4">{item.thinkingScore}</td>
                  <td className="px-4 py-4">{item.willingScore}</td>
                  <td className="px-4 py-4">{item.feelingScore}</td>
                  <td className="px-4 py-4">{item.beingScore.toFixed(1)}</td>
                  <td className="px-4 py-4 text-primary">{item.stateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-0 rounded-2xl border border-border/70 bg-card/45 p-3 md:rounded-md md:p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:text-xs md:tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-medium text-foreground md:text-xl">{value}</p>
    </article>
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
    <article className="rounded-2xl border border-border/55 bg-card/55 p-4 md:rounded-md">
      <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.2em]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
        {body ?? "Reading the pattern..."}
      </p>
    </article>
  );
}

function GapInsightCard({ insight }: { insight: GapInsight }) {
  return (
    <section className="aura-glass mx-auto mt-8 max-w-6xl rounded-2xl p-5 md:rounded-lg md:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
              The Gap To Fill
            </p>
          </div>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:mt-4 md:text-4xl">
            {insight.missingBridge}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:mt-4 md:text-base md:leading-7">
            Fill the gap by bringing your weakest pillar into agreement with
            your strongest one.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card/45 p-4 md:rounded-md">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Gap closed</span>
            <span>{insight.progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${insight.progress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {insight.distanceLabel}
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <GapState label="Current" value={insight.currentState} />
        <div className="hidden items-center justify-center md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card">
            <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
          </span>
        </div>
        <GapState label="Desired" value={insight.desiredState} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <GapDetail
          label="Bridge pillar"
          value={insight.bridgePillar ?? "-"}
          detail={
            insight.bridgePillar
              ? `${insight.bridgePillar} is where the gap is most visible.`
              : "Complete check-ins to reveal the bridge."
          }
        />
        <GapDetail
          label="Support"
          value={insight.supportPillar ?? "-"}
          detail={
            insight.supportPillar
              ? `Use ${insight.supportPillar} as support instead of starting from zero.`
              : "Your support pillar will appear with more signal."
          }
        />
        <GapDetail
          label="Next bridge move"
          value={insight.nextMove}
          detail="Do this before adding more complexity."
        />
      </div>
    </section>
  );
}

function GapState({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/45 p-4 md:rounded-md md:p-5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:text-xs md:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-semibold leading-tight text-foreground md:mt-3 md:text-3xl">
        {value}
      </p>
    </article>
  );
}

function GapDetail({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/35 p-4 md:rounded-md">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:text-xs md:tracking-[0.2em]">
        {label}
      </p>
      <p className="mt-2 text-lg font-medium text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </article>
  );
}

function buildGapInsight(
  dashboard: ReturnType<typeof buildBeingDashboardData>,
  onboardingProfile: OnboardingProfile | null,
): GapInsight {
  const latestScore = dashboard.latestScore ?? 0;
  const desiredState =
    onboardingProfile?.desiredState.trim() || "Clear, steady Being";
  const bridgePillar = dashboard.weakestPillar;
  const supportPillar = dashboard.strongestPillar;
  const nextThreshold = getNextThreshold(latestScore);
  const pointsToThreshold = Math.max(0, nextThreshold.score - latestScore);
  const progress = Math.round(Math.min((latestScore / nextThreshold.score) * 100, 100));

  return {
    currentState:
      dashboard.latestScore === null
        ? "Unmeasured"
        : `${latestScore.toFixed(1)} / 10`,
    desiredState,
    bridgePillar,
    supportPillar,
    distanceLabel:
      dashboard.latestScore === null
        ? "Complete a check-in to reveal the gap."
        : `${pointsToThreshold.toFixed(1)} points from ${nextThreshold.label}.`,
    progress,
    missingBridge: getMissingBridge(bridgePillar, latestScore),
    nextMove: getBridgeMove(bridgePillar),
  };
}

function getNextThreshold(score: number) {
  if (score < 6) return { label: "stable alignment", score: 6 };
  if (score < 7.5) return { label: "aligned action", score: 7.5 };
  if (score < 9) return { label: "magnetic coherence", score: 9 };
  return { label: "sustained magnetic coherence", score: 10 };
}

function getMissingBridge(pillar: PillarName | null, score: number) {
  if (!pillar) return "The gap will appear once you create signal.";

  const byPillar: Record<PillarName, string> = {
    Thinking: "The gap is cleaner perception.",
    Willing: "The gap is embodied action.",
    Feeling: "The gap is emotional agreement.",
  };

  if (score < 6) return `${byPillar[pillar]} Stabilize it first.`;
  if (score < 7.5) return `${byPillar[pillar]} Make it repeatable.`;
  return `${byPillar[pillar]} Protect it under pressure.`;
}

function getBridgeMove(pillar: PillarName | null) {
  if (!pillar) return "Check in";

  const moves: Record<PillarName, string> = {
    Thinking: "Name one truer sentence",
    Willing: "Complete one visible action",
    Feeling: "Practice the state now",
  };

  return moves[pillar];
}

function ScoreTrendChart({
  timeline,
}: {
  timeline: Array<{ date: string; score: number }>;
}) {
  if (timeline.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-border/70 bg-card/45 p-6 text-sm text-muted-foreground">
        Complete check-ins to build your score graph.
      </div>
    );
  }

  const chart = buildChartPoints(timeline);
  const latest = timeline[timeline.length - 1];

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="rounded-md border border-border/70 bg-card/45 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Being Score Trend
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {timeline.length} recorded day{timeline.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="font-serif text-2xl font-semibold">
              {latest.score.toFixed(1)}
            </p>
          </div>
        </div>

        <MobileScoreTrend timeline={timeline} />

        <div className="hidden lg:block">
          <svg
            viewBox="0 0 720 280"
            className="h-auto min-h-[260px] w-full text-foreground"
            role="img"
            aria-label="Being score line graph over time"
          >
            {[0, 2.5, 5, 7.5, 10].map((score) => {
              const y = scoreToY(score);

              return (
                <g key={score}>
                  <line
                    x1="56"
                    x2="688"
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeDasharray={score === 0 ? "0" : "4 6"}
                  />
                  <text
                    x="22"
                    y={y + 4}
                    className="fill-muted-foreground text-[12px]"
                  >
                    {score}
                  </text>
                </g>
              );
            })}

            <line x1="56" x2="56" y1="28" y2="240" className="stroke-border" />
            <line x1="56" x2="688" y1="240" y2="240" className="stroke-border" />

            {chart.areaPath ? (
              <path d={chart.areaPath} className="fill-primary/10" />
            ) : null}
            {chart.linePath ? (
              <path
                d={chart.linePath}
                className="fill-none stroke-primary"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {chart.points.map((point, index) => (
              <g key={`${point.date}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="fill-background stroke-primary"
                  strokeWidth="3"
                />
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  className="fill-foreground text-[12px]"
                >
                  {point.score.toFixed(1)}
                </text>
              </g>
            ))}

            {chart.points.map((point, index) => (
              <text
                key={`${point.date}-${index}-label`}
                x={point.x}
                y="264"
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {formatShortDate(point.date)}
              </text>
            ))}
          </svg>
        </div>
      </div>

      <div className="hidden rounded-md border border-border/70 bg-card/45 p-4 lg:block">
        <p className="text-sm font-medium text-foreground">Recent Scores</p>
        <div className="mt-4 divide-y divide-border/60">
          {timeline
            .slice(-6)
            .reverse()
            .map((point, index) => (
              <div
                key={`${point.date}-${index}`}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{point.date}</span>
                <span className="font-medium text-foreground">
                  {point.score.toFixed(1)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function MobileScoreTrend({
  timeline,
}: {
  timeline: Array<{ date: string; score: number }>;
}) {
  const recent = timeline.slice(-7).reverse();

  return (
    <div className="grid gap-3 lg:hidden">
      {recent.map((point, index) => (
        <div
          key={`${point.date}-${index}`}
          className="rounded-md border border-border/70 bg-background/35 p-3"
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{point.date}</span>
            <span className="font-serif text-2xl font-semibold">
              {point.score.toFixed(1)}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(point.score * 10, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildChartPoints(timeline: Array<{ date: string; score: number }>) {
  const left = 72;
  const right = 672;
  const width = right - left;
  const points = timeline.map((point, index) => {
    const x =
      timeline.length === 1
        ? left + width / 2
        : left + (index / (timeline.length - 1)) * width;

    return {
      ...point,
      x,
      y: scoreToY(point.score),
    };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} 240 L ${points[0].x} 240 Z`
      : "";

  return { points, linePath, areaPath };
}

function scoreToY(score: number) {
  const top = 28;
  const bottom = 240;
  const clamped = Math.max(0, Math.min(score, 10));
  return bottom - (clamped / 10) * (bottom - top);
}

function formatShortDate(date: string) {
  const parts = date.split("/");

  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return date;
}

function formatDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString();
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
      [entry.id, entry.date, entry.content.trim()].join("|"),
    )
    .join("::");
  const profileSignal = onboardingProfile
    ? [
        onboardingProfile.primaryGoal,
        onboardingProfile.currentChallenge,
        onboardingProfile.desiredState,
        onboardingProfile.birthDate ?? "",
        onboardingProfile.practiceStyle,
        onboardingProfile.spiritualOpenness,
        onboardingProfile.commitmentLevel,
        onboardingProfile.guidanceTone,
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
