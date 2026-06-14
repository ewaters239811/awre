"use client";

import { buildPatternInsights } from "@/lib/insights";
import type { CheckInResult } from "@/lib/types";

export function PatternInsights({ items }: { items: CheckInResult[] }) {
  const insights = buildPatternInsights(items);

  if (insights.length === 0) return null;

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {insights.map((insight) => (
        <article key={insight.label} className="aura-glass rounded-lg p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">
            {insight.label}
          </p>
          <p className="mt-3 font-serif text-3xl font-semibold">
            {insight.value}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {insight.detail}
          </p>
        </article>
      ))}
    </section>
  );
}
