"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryCalendar } from "@/components/history-calendar";
import { getCheckInDateKey, getCheckIns } from "@/lib/alignment";
import { buildBeingDashboardData } from "@/lib/being-analysis";
import { displayPillarName } from "@/lib/pillars";
import { ManifestationFocus } from "@/components/manifestation-focus";
import { useManifestations } from "@/lib/use-manifestations";
import type { CheckInResult, PillarName } from "@/lib/types";

type PatternSummary = {
  title: string;
  reason: string;
  focusPillar: PillarName | null;
  nextMove: string;
  nextDetail: string;
};

export function BeingDashboard() {
  const { primary } = useManifestations();
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInResult | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const savedCheckIns = getCheckIns();
      setCheckIns(savedCheckIns);
      setSelectedCheckIn(savedCheckIns[0] ?? null);
      setLoaded(true);
    });
  }, [primary?.id]);

  const dashboard = useMemo(
    () => buildBeingDashboardData(checkIns, []),
    [checkIns],
  );
  const pattern = useMemo(
    () => buildPatternSummary(checkIns, dashboard),
    [checkIns, dashboard],
  );

  return (
    <main className="clearpth-page-shell">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Pattern</p>
        <h1 className="clearpth-page-title">What Keeps Creating The Gap?</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
          See the repeated gap between your current state and your desired
          reality.
        </p>
      </section>

      <div className="mx-auto max-w-5xl">
        <ManifestationFocus compact />
      </div>
      {!loaded ? (
        <div
          role="status"
          className="mx-auto max-w-5xl py-10 text-sm text-muted-foreground"
        >
          Loading your patterns...
        </div>
      ) : checkIns.length === 0 ? (
        <section className="mx-auto mt-9 max-w-5xl border-b border-border/45 pb-8">
          <h2 className="font-serif text-3xl font-semibold">No pattern yet.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Complete a check-in to begin seeing what repeats.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/check-in">Begin Check In</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-8 grid max-w-5xl gap-8 border-b border-border/45 pb-8 md:grid-cols-2 md:gap-12 md:pb-10">
            <section aria-labelledby="gap-cause-heading" className="min-w-0">
              <h2
                id="gap-cause-heading"
                className="text-sm font-medium text-primary"
              >
                What&apos;s creating the gap
              </h2>
              <p className="mt-4 break-words font-serif text-2xl font-semibold leading-snug">
                {pattern.title}
              </p>
              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                {pattern.reason}
              </p>
            </section>
            <section aria-labelledby="gap-help-heading" className="min-w-0">
              <h2
                id="gap-help-heading"
                className="text-sm font-medium text-primary"
              >
                What can help close the gap
              </h2>
              <p className="mt-4 break-words font-serif text-2xl font-semibold leading-snug">
                {pattern.nextMove}
              </p>
              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                {pattern.nextDetail}
              </p>
            </section>
          </section>

          <section
            className="mx-auto mt-8 max-w-5xl border-b border-border/45 pb-8 md:mt-10 md:pb-10"
            aria-labelledby="alignment-trend-heading"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
              <h2
                id="alignment-trend-heading"
                className="font-serif text-2xl font-semibold"
              >
                Alignment Trend
              </h2>
            </div>
            <ScoreTrendChart timeline={dashboard.timeline} />
          </section>

          <section className="mx-auto mt-9 max-w-5xl">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  Check-In History
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight">
                  Recorded Days
                </h2>
              </div>
            </div>
            <HistoryCalendar
              items={checkIns}
              selectedId={selectedCheckIn?.id}
              onSelect={setSelectedCheckIn}
            />
            <SelectedPatternDay item={selectedCheckIn} />
          </section>
        </>
      )}
    </main>
  );
}

function SelectedPatternDay({ item }: { item: CheckInResult | null }) {
  if (!item) return null;

  return (
    <section className="mt-6 rounded-2xl border border-border/65 bg-card/35 p-4 md:aura-glass md:rounded-lg md:p-6">
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

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 lg:grid-cols-5">
        <MiniStat label="Score" value={item.beingScore.toFixed(1)} />
        <MiniStat label="Thinking" value={String(item.thinkingScore)} />
        <MiniStat label="Acting" value={String(item.willingScore)} />
        <MiniStat label="Feeling" value={String(item.feelingScore)} />
        <MiniStat label="Focus" value={displayPillarName(item.weakestPillar)} />
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
      <p className="mt-2 truncate text-lg font-medium text-foreground md:text-xl">
        {value}
      </p>
    </article>
  );
}

function buildPatternSummary(
  checkIns: CheckInResult[],
  dashboard: ReturnType<typeof buildBeingDashboardData>,
): PatternSummary {
  if (checkIns.length === 0 || !dashboard.weakestPillar) {
    return {
      title: "Your pattern is still forming.",
      reason:
        "Complete a few check-ins so ClearPth can show what keeps creating distance.",
      focusPillar: null,
      nextMove: "Check in",
      nextDetail:
        "Rate your current alignment and write about your day to give the pattern context.",
    };
  }

  const focusPillar = dashboard.weakestPillar;
  const averages = Object.values(dashboard.pillarAverages);
  if (Math.min(...averages) >= 8)
    return {
      title: "Your ratings show strong inner alignment.",
      reason:
        "Your thoughts, feelings, and actions are all rated highly across your check-ins.",
      focusPillar: null,
      nextMove: "Keep what is working.",
      nextDetail:
        "Repeat the choices that support your clarity and follow-through rather than looking for a problem to fix.",
    };
  if (Math.max(...averages) - Math.min(...averages) < 0.2)
    return {
      title: "No single area stands apart yet.",
      reason:
        "Your ratings are close across thoughts, feelings, and actions; they do not point to one clear gap.",
      focusPillar: null,
      nextMove: "Notice what changes your alignment.",
      nextDetail:
        "Use your next check-in and journal to notice which situations help you feel clear and act with intention.",
    };
  const byPillar: Record<PillarName, Omit<PatternSummary, "focusPillar">> = {
    Thinking: {
      title: "Thinking is your lowest-rated area.",
      reason:
        "Across your check-ins, your thoughts tend to feel less aligned with your desired reality than your feelings and actions.",
      nextMove: "Name one truer thought",
      nextDetail:
        "Notice a thought that gets in your way, check it against the facts, and choose a more useful perspective.",
    },
    Doing: {
      title: "Acting is your lowest-rated area.",
      reason:
        "Your choices and actions tend to be rated lower than your thoughts and feelings in relation to your desired reality.",
      nextMove: "Finish one visible action",
      nextDetail:
        "Choose one small step toward your desired reality that you can finish today, even if your mood changes.",
    },
    Feeling: {
      title: "Feeling is your lowest-rated area.",
      reason:
        "Your emotional state tends to feel less aligned with the person you are becoming than your thoughts and actions.",
      nextMove: "Practice the state now",
      nextDetail:
        "Take a brief pause, name what you feel, and give yourself room to settle before choosing what to do.",
    },
  };

  return {
    ...byPillar[focusPillar],
    focusPillar,
  };
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
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
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
          aria-label="Score line graph over time"
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
              {showChartLabel(index, chart.points.length) ? (
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  className="fill-foreground text-[12px]"
                >
                  {point.score.toFixed(1)}
                </text>
              ) : null}
            </g>
          ))}

          {chart.points.map((point, index) =>
            showChartLabel(index, chart.points.length) ? (
              <text
                key={`${point.date}-${index}-label`}
                x={point.x}
                y="264"
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {formatShortDate(point.date)}
              </text>
            ) : null,
          )}
        </svg>
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
    <div className="divide-y divide-border/40 lg:hidden">
      {recent.map((point, index) => (
        <div
          key={`${point.date}-${index}`}
          className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 py-3"
        >
          <span className="text-xs text-muted-foreground">{point.date}</span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(point.score * 10, 100)}%` }}
            />
          </div>
          <span className="text-right text-sm font-medium tabular-nums">
            {point.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function showChartLabel(index: number, length: number) {
  return (
    index === 0 ||
    index === length - 1 ||
    index % Math.max(1, Math.ceil(length / 6)) === 0
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
