"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckInResult } from "@/lib/types";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HistoryCalendar({
  items,
  selectedId,
  onSelect,
}: {
  items: CheckInResult[];
  selectedId?: string;
  onSelect?: (item: CheckInResult) => void;
}) {
  const [visibleDate, setVisibleDate] = useState(() => new Date());

  const monthLabel = visibleDate.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const scoresByDate = useMemo(() => {
    const grouped = new Map<string, CheckInResult[]>();

    for (const item of items) {
      const key = toDateKey(new Date(item.createdAt));
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    return grouped;
  }, [items]);

  const days = useMemo(() => buildMonthDays(visibleDate), [visibleDate]);

  const shiftMonth = (amount: number) => {
    setVisibleDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  return (
    <section className="aura-glass mt-8 rounded-lg p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            Score Calendar
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
            {monthLabel}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Each day shows the score recorded for that date. Tap a day to
            inspect it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
        {weekdays.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const key = toDateKey(day.date);
          const checkIns = scoresByDate.get(key) ?? [];
          const latestCheckIn = getLatestCheckIn(checkIns);
          const score = latestCheckIn?.beingScore ?? null;
          const isCurrentMonth = day.date.getMonth() === visibleDate.getMonth();
          const isSelected = Boolean(
            latestCheckIn && latestCheckIn.id === selectedId,
          );

          return (
            <button
              key={key}
              type="button"
              disabled={!latestCheckIn}
              onClick={() => {
                if (latestCheckIn) onSelect?.(latestCheckIn);
              }}
              title={
                score
                  ? `${score.toFixed(1)} Being score`
                  : "No check-in recorded"
              }
              className={cn(
                "flex aspect-square min-h-11 flex-col items-center justify-center rounded-md border border-border/50 bg-card/55 p-1 text-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 disabled:hover:translate-y-0 sm:min-h-14 sm:text-sm",
                !isCurrentMonth && "opacity-35",
                score && getScoreClass(score),
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {day.date.getDate()}
              </span>
              {score ? (
                <span className="mt-0.5 font-serif text-base font-semibold sm:mt-1 sm:text-xl">
                  {score.toFixed(1)}
                </span>
              ) : (
                <span className="mt-1 h-6 text-muted-foreground/40">-</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-5">
        <Legend label="Fragmented" className="bg-red-500/20" />
        <Legend label="Unstable" className="bg-amber-500/20" />
        <Legend label="Awakening" className="bg-teal-500/20" />
        <Legend label="Aligned" className="bg-primary/25" />
        <Legend label="Magnetic" className="bg-primary/45" />
      </div>
    </section>
  );
}

function buildMonthDays(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const firstVisible = new Date(start);
  firstVisible.setDate(start.getDate() - start.getDay());

  const totalDays = Math.ceil((firstVisible.getDay() + end.getDate()) / 7) * 7;

  return Array.from({ length: totalDays }, (_, index) => {
    const next = new Date(firstVisible);
    next.setDate(firstVisible.getDate() + index);
    return { date: next };
  });
}

function getLatestCheckIn(items: CheckInResult[]) {
  if (items.length === 0) return null;

  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

function getScoreClass(score: number) {
  if (score < 4) return "border-red-300/20 bg-red-500/15 text-red-100";
  if (score < 6) return "border-amber-300/20 bg-amber-500/15 text-amber-100";
  if (score < 7.5) return "border-teal-300/20 bg-teal-500/15 text-teal-100";
  if (score < 9) return "border-primary/30 bg-primary/20 text-primary";
  return "border-primary/45 bg-primary/35 text-primary-foreground";
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-sm", className)} />
      <span>{label}</span>
    </div>
  );
}
