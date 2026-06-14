"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HistoryCalendar } from "@/components/history-calendar";
import { PatternInsights } from "@/components/pattern-insights";
import { clearCheckIns, getCheckIns } from "@/lib/alignment";
import type { CheckInResult } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<CheckInResult[]>([]);

  useEffect(() => {
    queueMicrotask(() => setItems(getCheckIns()));
  }, []);

  const clear = () => {
    clearCheckIns();
    setItems([]);
  };

  return (
    <main className="container py-8 md:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="clearpth-page-kicker">
            Local History
          </p>
          <h1 className="clearpth-page-title">
            Previous Check-Ins
          </h1>
        </div>
        {items.length > 0 ? (
          <Button variant="secondary" onClick={clear}>
            Clear History
          </Button>
        ) : null}
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
            <Link href="/check-in">Begin Check-In</Link>
          </Button>
        </div>
      ) : (
        <>
          <PatternInsights items={items} />
          <HistoryCalendar items={items} />
          <div className="mt-8 overflow-hidden rounded-lg border border-border aura-glass">
            <div className="flex items-center justify-between border-b border-border/55 px-4 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-primary">
                  Entries
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {items.length} total check-in{items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/5 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Thinking</th>
                    <th className="px-4 py-3 font-medium">Willing</th>
                    <th className="px-4 py-3 font-medium">Feeling</th>
                    <th className="px-4 py-3 font-medium">Being</th>
                    <th className="px-4 py-3 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-border/55 transition hover:bg-white/[0.035]"
                    >
                      <td className="px-4 py-4">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">{item.thinkingScore}</td>
                      <td className="px-4 py-4">{item.willingScore}</td>
                      <td className="px-4 py-4">{item.feelingScore}</td>
                      <td className="px-4 py-4">{item.beingScore}</td>
                      <td className="px-4 py-4 text-primary">
                        {item.stateLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
