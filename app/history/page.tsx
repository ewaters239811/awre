"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryCalendar } from "@/components/history-calendar";
import { PatternInsights } from "@/components/pattern-insights";
import { clearRemoteCheckIns } from "@/lib/account-data";
import { clearCheckIns, getCheckInDateKey, getCheckIns } from "@/lib/alignment";
import type { CheckInResult } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<CheckInResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<CheckInResult | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = getCheckIns();
      setItems(saved);
      setSelectedItem(saved[0] ?? null);
    });
  }, []);

  const stats = useMemo(() => buildHistoryStats(items), [items]);

  const clear = async () => {
    try {
      await clearRemoteCheckIns();
      clearCheckIns();
      setItems([]);
      setSelectedItem(null);
    } catch {
      clearCheckIns();
      setItems([]);
      setSelectedItem(null);
    }
  };

  return (
    <main className="container py-8 md:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="clearpth-page-kicker">Your Record</p>
          <h1 className="clearpth-page-title">Every Day You Measured</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Your archive of check-ins, organized by day. Use this page to
            inspect what happened; use Patterns to understand what it means.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard">
            View Patterns
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="aura-glass mt-8 rounded-lg p-6">
          <h2 className="font-serif text-3xl font-semibold">
            Your record is still open.
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Complete your first alignment check-in to begin seeing your state
            patterns over time.
          </p>
          <Button asChild className="mt-6">
            <Link href="/check-in">Begin Check In</Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <HistoryStat label="Total days" value={String(stats.totalDays)} />
            <HistoryStat label="Average" value={stats.averageScore} />
            <HistoryStat label="Highest" value={stats.highestScore} />
            <HistoryStat label="Lowest" value={stats.lowestScore} />
          </section>

          <PatternInsights items={items} />

          <HistoryCalendar
            items={items}
            selectedId={selectedItem?.id}
            onSelect={setSelectedItem}
          />

          <SelectedDayCard item={selectedItem} />

          <RecentEntries items={items} />

          <section className="aura-glass mt-8 rounded-lg p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Data
            </p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Check-ins are stored on your account profile. Clearing history
                removes the record used by History and Patterns.
              </p>
              <Button variant="secondary" onClick={clear}>
                Clear history
              </Button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="aura-glass rounded-lg p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold">{value}</p>
    </article>
  );
}

function SelectedDayCard({ item }: { item: CheckInResult | null }) {
  if (!item) return null;

  return (
    <section className="aura-glass mt-8 rounded-lg p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
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
          <Link href={`/results?id=${item.id}`}>View Result</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Being" value={item.beingScore.toFixed(1)} />
        <MiniStat label="Thinking" value={String(item.thinkingScore)} />
        <MiniStat label="Willing" value={String(item.willingScore)} />
        <MiniStat label="Feeling" value={String(item.feelingScore)} />
        <MiniStat label="Growth edge" value={item.weakestPillar} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-border/70 bg-card/45 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-medium text-foreground">{value}</p>
    </article>
  );
}

function RecentEntries({ items }: { items: CheckInResult[] }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            Recent Entries
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">
            Latest Records
          </h2>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {items.length} total check-in{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {items.slice(0, 10).map((item) => (
          <article
            key={item.id}
            className="aura-glass rounded-lg p-4"
          >
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
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <MiniStat label="Think" value={String(item.thinkingScore)} />
              <MiniStat label="Will" value={String(item.willingScore)} />
              <MiniStat label="Feel" value={String(item.feelingScore)} />
            </div>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link href={`/results?id=${item.id}`}>View Result</Link>
            </Button>
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
                <th className="px-4 py-3 font-medium">Being</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Result</th>
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
                  <td className="px-4 py-4">
                    <Link
                      href={`/results?id=${item.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function buildHistoryStats(items: CheckInResult[]) {
  const scores = items.map((item) => item.beingScore);
  const uniqueDays = new Set(items.map((item) => getCheckInDateKey(item)));

  return {
    totalDays: uniqueDays.size,
    averageScore: average(scores).toFixed(1),
    highestScore: Math.max(...scores).toFixed(1),
    lowestScore: Math.min(...scores).toFixed(1),
  };
}

function formatDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString();
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
