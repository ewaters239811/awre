import type { CheckInResult, PillarName } from "@/lib/types";

export type PatternInsight = {
  label: string;
  value: string;
  detail: string;
};

export function buildPatternInsights(items: CheckInResult[]): PatternInsight[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const averages = {
    Thinking: average(items.map((item) => item.thinkingScore)),
    Willing: average(items.map((item) => item.willingScore)),
    Feeling: average(items.map((item) => item.feelingScore)),
  } satisfies Record<PillarName, number>;

  const weakest = Object.entries(averages).sort((a, b) => a[1] - b[1])[0] as [
    PillarName,
    number,
  ];
  const strongest = Object.entries(averages).sort((a, b) => b[1] - a[1])[0] as [
    PillarName,
    number,
  ];
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const trend = latest.beingScore - first.beingScore;
  const best = [...items].sort((a, b) => b.beingScore - a.beingScore)[0];

  return [
    {
      label: "Average Being",
      value: average(items.map((item) => item.beingScore)).toFixed(1),
      detail: `${items.length} check-in${items.length === 1 ? "" : "s"} recorded in this browser.`,
    },
    {
      label: "Strongest Pillar",
      value: strongest[0],
      detail: `${strongest[0]} is carrying the most coherence across your entries.`,
    },
    {
      label: "Growth Edge",
      value: weakest[0],
      detail: `${weakest[0]} is asking for the most patient daily attention.`,
    },
    {
      label: "Trend",
      value: trend > 0.2 ? `+${trend.toFixed(1)}` : trend < -0.2 ? trend.toFixed(1) : "Stable",
      detail:
        trend > 0.2
          ? "Your Being score is rising from your earliest entry."
          : trend < -0.2
            ? "Your Being score is lower than your earliest entry. Treat this as information, not judgment."
            : "Your Being score is holding steady. Look for small levers, not dramatic corrections.",
    },
    {
      label: "Highest State",
      value: best.beingScore.toFixed(1),
      detail: `${best.stateLabel} on ${new Date(best.createdAt).toLocaleDateString()}.`,
    },
  ];
}

export function getWeekRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function filterByDateRange<T extends { createdAt: string }>(
  items: T[],
  start: Date,
  end: Date,
) {
  return items.filter((item) => {
    const time = new Date(item.createdAt).getTime();
    return time >= start.getTime() && time <= end.getTime();
  });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
