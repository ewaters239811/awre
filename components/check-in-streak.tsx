"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flame, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheckIns } from "@/lib/alignment";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { CheckInResult } from "@/lib/types";

const milestones = [3, 7, 14, 30];

export function CheckInStreak() {
  const todayKey = useCurrentDateKey();
  const [checkIns, setCheckIns] = useState<CheckInResult[]>([]);

  useEffect(() => {
    queueMicrotask(() => setCheckIns(getCheckIns()));
  }, []);

  const stats = useMemo(
    () => buildStreakStats(checkIns, todayKey),
    [checkIns, todayKey],
  );
  const nextMilestone =
    milestones.find((milestone) => milestone > stats.currentStreak) ??
    milestones[milestones.length - 1];
  const progress =
    nextMilestone > 0
      ? Math.min((stats.currentStreak / nextMilestone) * 100, 100)
      : 0;

  return (
    <section className="aura-glass rounded-lg p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Check In Streak
            </p>
          </div>
          <p className="mt-4 text-5xl font-semibold">
            {stats.currentStreak}
            <span className="ml-2 text-base text-muted-foreground">
              day{stats.currentStreak === 1 ? "" : "s"}
            </span>
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {stats.checkedInToday
              ? "Today is counted. The streak is alive."
              : "Complete today's check-in to keep the streak alive."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {stats.totalCheckIns} total check-in
            {stats.totalCheckIns === 1 ? "" : "s"} recorded.
          </p>
        </div>

        <div className="min-w-0 flex-1 md:max-w-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Next reward</span>
            <span>{nextMilestone} days</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {milestones.map((milestone) => {
              const unlocked = stats.currentStreak >= milestone;

              return (
                <div
                  key={milestone}
                  className="rounded-md border border-border bg-card px-3 py-2 text-center"
                >
                  {unlocked ? (
                    <CheckCircle2
                      className="mx-auto h-4 w-4 text-primary"
                      aria-hidden
                    />
                  ) : (
                    <Lock
                      className="mx-auto h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {milestone}d
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <Button asChild>
          <Link href="/check-in">Check In</Link>
        </Button>
      </div>
    </section>
  );
}

function buildStreakStats(checkIns: CheckInResult[], todayKey: string) {
  const dates = new Set(
    checkIns.map((item) => toDateKey(new Date(item.createdAt))),
  );
  const checkedInToday = dates.has(todayKey);
  const cursor = new Date(`${todayKey}T12:00:00`);
  let currentStreak = 0;

  while (dates.has(toDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    currentStreak,
    checkedInToday,
    totalCheckIns: checkIns.length,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
