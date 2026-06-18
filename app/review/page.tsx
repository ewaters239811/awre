"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Crosshair,
  Shield,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheckIns } from "@/lib/alignment";
import {
  buildPatternInsights,
  filterByDateRange,
  getWeekRange,
} from "@/lib/insights";
import { getRituals } from "@/lib/ritual-storage";
import type { CheckInResult, DailyRitual, PillarName } from "@/lib/types";

export default function ReviewPage() {
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);
  const [rituals, setRituals] = useState<DailyRitual[]>([]);
  const { start, end } = useMemo(() => getWeekRange(), []);

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIns(getCheckIns());
      setRituals(getRituals());
    });
  }, []);

  const weeklyCheckIns = filterByDateRange(checkIns, start, end);
  const weeklyRituals = rituals.filter((ritual) => {
    const ritualDate = new Date(`${ritual.date}T12:00:00`);
    return ritualDate >= start && ritualDate <= end;
  });
  const insights = buildPatternInsights(weeklyCheckIns);
  const averageBeing =
    weeklyCheckIns.length > 0
      ? (
          weeklyCheckIns.reduce((sum, item) => sum + item.beingScore, 0) /
          weeklyCheckIns.length
        ).toFixed(1)
      : "-";
  const report = buildWeeklyReport(weeklyCheckIns, weeklyRituals);

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-border/60 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="clearpth-page-kicker">Weekly Pattern Review</p>
            <h1 className="clearpth-page-title">
              Your Week, Measured Clearly
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card/35 px-4 py-3 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            <span>
              {start.toLocaleDateString()} - {end.toLocaleDateString()}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl rounded-md border border-border/70 bg-card/30">
        <div className="grid divide-y divide-border/60 md:grid-cols-4 md:divide-x md:divide-y-0">
          <ReviewStat label="Average Being" value={averageBeing} />
          <ReviewStat label="Check-ins" value={String(weeklyCheckIns.length)} />
          <ReviewStat label="Rituals" value={String(weeklyRituals.length)} />
          <ReviewStat label="Weekly Signal" value={report.signalLabel} />
        </div>
      </section>

      {weeklyCheckIns.length === 0 ? (
        <section className="mx-auto mt-8 max-w-6xl rounded-md border border-border/70 bg-card/30 p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                No signal yet
              </p>
              <h2 className="mt-3 font-serif text-4xl font-semibold">
                This week has not been measured.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                Complete a check-in or daily ritual to begin building a weekly
                pattern. ClearPth needs repeated signal before it can separate
                a passing mood from a real leak.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Button asChild>
                <Link href="/check-in">Begin Check-In</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/ritual">Open Ritual</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-md border border-foreground/20 bg-card p-6 md:p-7">
              <div className="flex items-center gap-3">
                <Crosshair className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Primary Signal
                </p>
              </div>
              <h2 className="mt-4 font-serif text-4xl font-semibold">
                {report.primaryTitle}
              </h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
                {report.primaryDetail}
              </p>
            </article>

            <article className="rounded-md border border-border/70 bg-card/30 p-6 md:p-7">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Next Correction
                </p>
              </div>
              <p className="mt-4 font-serif text-3xl font-semibold">
                {report.correctionTitle}
              </p>
              <p className="mt-4 leading-7 text-muted-foreground">
                {report.correctionDetail}
              </p>
            </article>
          </section>

          <section className="mx-auto mt-8 max-w-6xl rounded-md border border-border/70 bg-card/30">
            <div className="border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Pattern Intelligence
                </p>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {insights.map((insight) => (
                <PatternRow
                  key={insight.label}
                  label={insight.label}
                  value={insight.value}
                  detail={insight.detail}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {weeklyRituals.length > 0 ? (
        <section className="mx-auto mt-8 max-w-6xl rounded-md border border-border/70 bg-card/30">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" aria-hidden />
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                Ritual Notes
              </p>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {weeklyRituals.map((ritual) => (
              <article
                key={ritual.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[140px_1fr] md:items-start"
              >
                <p className="text-sm text-primary">{ritual.date}</p>
                <div>
                  <p className="font-serif text-2xl font-semibold">
                    {ritual.chosenBeing || "Chosen Being not named"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {ritual.lesson ||
                      ritual.morningIntention ||
                      "No lesson recorded yet."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold text-foreground">
        {value}
      </p>
    </article>
  );
}

function PatternRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="grid gap-3 px-5 py-4 md:grid-cols-[190px_160px_1fr] md:items-center">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="font-serif text-3xl font-semibold text-primary">{value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
    </article>
  );
}

function buildWeeklyReport(
  checkIns: CheckInResult[],
  rituals: DailyRitual[],
) {
  if (checkIns.length === 0) {
    return {
      signalLabel: "Unmeasured",
      primaryTitle: "No signal recorded",
      primaryDetail:
        "There is not enough weekly data to identify where power is gathering or leaking.",
      correctionTitle: "Create signal",
      correctionDetail:
        "Complete one check-in and one ritual so the week has something real to read.",
    };
  }

  const sorted = [...checkIns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const trend = latest.beingScore - first.beingScore;
  const averages = getPillarAverages(checkIns);
  const weakest = getRankedPillar(averages, "weakest");
  const strongest = getRankedPillar(averages, "strongest");
  const ritualRhythm =
    rituals.length >= 3
      ? "Ritual rhythm is supporting the signal."
      : "Ritual rhythm is still thin, so the weekly pattern has less reinforcement.";

  if (trend < -0.3) {
    return {
      signalLabel: "Leaking",
      primaryTitle: `Power leaked through ${weakest}.`,
      primaryDetail: `Your score moved down this week, and ${weakest} is the lowest pillar. Treat this as operational feedback: the week is asking for a cleaner link between the state you want and the actions you repeat. ${ritualRhythm}`,
      correctionTitle: `Stabilize ${weakest}`,
      correctionDetail: `Next week, make one small daily correction in ${weakest}. Keep it visible, repeatable, and boring enough to actually complete.`,
    };
  }

  if (trend > 0.3) {
    return {
      signalLabel: "Gathering",
      primaryTitle: `Power gathered through ${strongest}.`,
      primaryDetail: `Your score moved up this week, and ${strongest} carried the most coherence. The task is not to chase intensity; it is to repeat the conditions that made this state easier to access. ${ritualRhythm}`,
      correctionTitle: `Protect ${strongest}`,
      correctionDetail: `Keep ${strongest} as the anchor, then use it to pull ${weakest} into one practical movement each day.`,
    };
  }

  return {
    signalLabel: "Stable",
    primaryTitle: `The week held steady around ${weakest}.`,
    primaryDetail: `Your score did not move dramatically, which means the useful question is not what changed, but what kept repeating. ${weakest} is the cleanest place to look for the hidden cost of delay, distraction, or emotional dependence. ${ritualRhythm}`,
    correctionTitle: `Apply pressure to ${weakest}`,
    correctionDetail: `Choose one daily act that proves ${weakest} is no longer waiting for ideal conditions before it participates.`,
  };
}

function getPillarAverages(items: CheckInResult[]) {
  return {
    Thinking: average(items.map((item) => item.thinkingScore)),
    Willing: average(items.map((item) => item.willingScore)),
    Feeling: average(items.map((item) => item.feelingScore)),
  } satisfies Record<PillarName, number>;
}

function getRankedPillar(
  averages: Record<PillarName, number>,
  rank: "weakest" | "strongest",
) {
  const entries = Object.entries(averages) as [PillarName, number][];
  const sorted = entries.sort((a, b) =>
    rank === "weakest" ? a[1] - b[1] : b[1] - a[1],
  );

  return sorted[0][0];
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
