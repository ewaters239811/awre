"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCheckIns } from "@/lib/alignment";
import {
  buildPatternInsights,
  filterByDateRange,
  getWeekRange,
} from "@/lib/insights";
import { getRituals } from "@/lib/ritual-storage";
import type { CheckInResult, DailyRitual } from "@/lib/types";

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

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Weekly Review</p>
        <h1 className="clearpth-page-title">
          This Week In Being
        </h1>
        <p className="mt-4 text-muted-foreground">
          {start.toLocaleDateString()} - {end.toLocaleDateString()}
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
        <ReviewStat label="Average Being" value={averageBeing} />
        <ReviewStat label="Check-Ins" value={String(weeklyCheckIns.length)} />
        <ReviewStat label="Rituals" value={String(weeklyRituals.length)} />
      </section>

      {weeklyCheckIns.length === 0 ? (
        <section className="aura-glass mx-auto mt-8 max-w-5xl rounded-lg p-6">
          <h2 className="font-serif text-3xl font-semibold">
            No check-ins this week yet.
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Complete a check-in or daily ritual to begin building your weekly
            pattern.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/check-in">Begin Check-In</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/ritual">Open Ritual</Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <article key={insight.label} className="aura-glass rounded-lg p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-primary">
                {insight.label}
              </p>
              <p className="mt-3 font-serif text-3xl font-semibold">
                {insight.value}
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                {insight.detail}
              </p>
            </article>
          ))}
        </section>
      )}

      {weeklyRituals.length > 0 ? (
        <section className="aura-glass mx-auto mt-8 max-w-5xl rounded-lg p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            Ritual Notes
          </p>
          <div className="mt-5 grid gap-4">
            {weeklyRituals.map((ritual) => (
              <article
                key={ritual.id}
                className="rounded-md border border-border/55 bg-black/18 p-4"
              >
                <p className="text-sm text-primary">{ritual.date}</p>
                <p className="mt-2 font-serif text-2xl font-semibold">
                  {ritual.chosenBeing || "Chosen Being not named"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {ritual.lesson ||
                    ritual.morningIntention ||
                    "No lesson recorded yet."}
                </p>
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
    <article className="aura-glass rounded-lg p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-primary">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold">{value}</p>
    </article>
  );
}
