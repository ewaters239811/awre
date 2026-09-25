"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Compass, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryCalendar } from "@/components/history-calendar";
import { getCheckInDateKey, getCheckIns } from "@/lib/alignment";
import { buildBeingDashboardData } from "@/lib/being-analysis";
import { displayPillarName } from "@/lib/pillars";
import type { CheckInResult, PillarName } from "@/lib/types";

type PatternSummary = {
  title: string;
  reason: string;
  focusPillar: PillarName | null;
  nextMove: string;
};

export function BeingDashboard() {
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInResult | null>(
    null,
  );

  useEffect(() => {
    queueMicrotask(() => {
      const savedCheckIns = getCheckIns();
      setCheckIns(savedCheckIns);
      setSelectedCheckIn(savedCheckIns[0] ?? null);
    });
  }, []);

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
        <h1 className="clearpth-page-title">What Keeps Repeating?</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
          Track the pattern that keeps pulling you toward or away from your
          desired reality.
        </p>
      </section>

      {checkIns.length === 0 ? (
        <section className="aura-glass mx-auto mt-9 max-w-5xl rounded-[1.35rem] p-5 md:rounded-lg md:p-6">
          <h2 className="font-serif text-3xl font-semibold">
            No pattern yet.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Complete a check-in to begin seeing what repeats.
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
          <section className="aura-glass mx-auto mt-9 max-w-5xl rounded-[1.35rem] p-5 md:rounded-lg md:p-7">
            <div className="grid gap-7 lg:grid-cols-[1fr_220px] lg:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" aria-hidden />
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                    Your Pattern
                  </p>
                </div>
                <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight md:text-5xl">
                  {pattern.title}
                </h2>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
                  {pattern.reason}
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-border/65 bg-card/40 p-4 text-center md:rounded-md">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Current State
                </p>
                <p className="mt-3 font-serif text-6xl font-semibold leading-none text-primary">
                  {dashboard.latestScore?.toFixed(1) ?? "-"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">out of 10</p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              <PatternStat
                label="Focus"
                value={
                  pattern.focusPillar
                    ? displayPillarName(pattern.focusPillar)
                    : "Unmeasured"
                }
                detail="The area most often behind the gap."
              />
              <PatternStat
                label="Average"
                value={
                  dashboard.averageScore === null
                    ? "Unmeasured"
                    : `${dashboard.averageScore.toFixed(1)} / 10`
                }
                detail="Your overall state across check-ins."
              />
              <PatternStat
                label="Next Move"
                value={pattern.nextMove}
                detail="Keep it simple enough to repeat."
              />
            </div>
          </section>

          <section className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-[0.72fr_1.28fr]">
            <section className="rounded-[1.35rem] border border-border/42 bg-card/20 p-5 md:aura-glass md:rounded-lg md:p-6">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  Pillars
                </p>
              </div>
              <div className="mt-6 grid gap-4">
                <PillarBar
                  label="Thinking"
                  value={dashboard.pillarAverages.Thinking}
                  active={pattern.focusPillar === "Thinking"}
                />
                <PillarBar
                  label="Doing"
                  value={dashboard.pillarAverages.Doing}
                  active={pattern.focusPillar === "Doing"}
                />
                <PillarBar
                  label="Feeling"
                  value={dashboard.pillarAverages.Feeling}
                  active={pattern.focusPillar === "Feeling"}
                />
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-border/42 bg-card/20 p-5 md:aura-glass md:rounded-lg md:p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                  State Over Time
                </p>
              </div>
              <ScoreTrendChart timeline={dashboard.timeline} />
            </section>
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
              <p className="text-sm text-muted-foreground">
                The calendar is here when you want the details.
              </p>
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

function PatternStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border/65 bg-card/35 p-4 md:rounded-md">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:text-xs md:tracking-[0.2em]">
        {label}
      </p>
      <p className="mt-2 text-lg font-medium leading-snug text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </article>
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
        <MiniStat label="Doing" value={String(item.willingScore)} />
        <MiniStat label="Feeling" value={String(item.feelingScore)} />
        <MiniStat
          label="Focus"
          value={displayPillarName(item.weakestPillar)}
        />
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

function PillarBar({
  label,
  value,
  active,
}: {
  label: PillarName;
  value: number;
  active: boolean;
}) {
  return (
    <div
      className={
        active ? "rounded-md border border-primary/20 bg-primary/8 p-3" : ""
      }
    >
      <div className="flex justify-between gap-3 text-sm">
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

function buildPatternSummary(
  checkIns: CheckInResult[],
  dashboard: ReturnType<typeof buildBeingDashboardData>,
): PatternSummary {
  if (checkIns.length === 0 || !dashboard.weakestPillar) {
    return {
      title: "Your pattern is still forming.",
      reason: "Complete a few check-ins so ClearPth can show what repeats.",
      focusPillar: null,
      nextMove: "Check in",
    };
  }

  const focusPillar = dashboard.weakestPillar;
  const byPillar: Record<PillarName, Omit<PatternSummary, "focusPillar">> = {
    Thinking: {
      title: "Your thoughts are the main gap.",
      reason:
        "Your check-ins show that perception is the area most often lagging behind the life you want.",
      nextMove: "Name one truer thought",
    },
    Doing: {
      title: "Your follow-through is the main gap.",
      reason:
        "Your check-ins show that action is the area most often lagging behind what you say matters.",
      nextMove: "Finish one visible action",
    },
    Feeling: {
      title: "Your inner state is the main gap.",
      reason:
        "Your check-ins show that emotion is the area most often pulling you back toward what feels familiar.",
      nextMove: "Practice the state now",
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
          <p className="text-sm font-medium text-foreground">Score Trend</p>
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
