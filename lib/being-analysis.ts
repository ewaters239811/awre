import type {
  BeingDashboardAnalysis,
  BeingMetric,
  CheckInResult,
  JournalEntry,
  PillarName,
} from "@/lib/types";
import { getCheckInDateKey } from "@/lib/alignment";

export type BeingDashboardData = {
  metrics: BeingMetric[];
  pillarAverages: Record<PillarName, number>;
  latestScore: number | null;
  averageScore: number | null;
  trend: number;
  volatility: number;
  integrationDebt: number;
  journalRhythm: number;
  weakestPillar: PillarName | null;
  strongestPillar: PillarName | null;
  timeline: Array<{
    date: string;
    score: number;
  }>;
  localAnalysis: BeingDashboardAnalysis;
};

export function buildBeingDashboardData(
  checkIns: CheckInResult[],
  journalEntries: JournalEntry[],
): BeingDashboardData {
  const sorted = [...checkIns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const latest = sorted[sorted.length - 1] ?? null;
  const averageScore = sorted.length
    ? average(sorted.map((item) => item.beingScore))
    : null;
  const trend = sorted.length > 1 ? latest.beingScore - sorted[0].beingScore : 0;
  const pillarAverages = buildPillarAverages(sorted);
  const rankedPillars = Object.entries(pillarAverages).sort(
    (a, b) => b[1] - a[1],
  ) as Array<[PillarName, number]>;
  const strongestPillar = sorted.length ? rankedPillars[0][0] : null;
  const weakestPillar = sorted.length
    ? rankedPillars[rankedPillars.length - 1][0]
    : null;
  const integrationDebt = sorted.length
    ? roundToTenth(rankedPillars[0][1] - rankedPillars[rankedPillars.length - 1][1])
    : 0;
  const volatility = sorted.length
    ? roundToTenth(standardDeviation(sorted.map((item) => item.beingScore)))
    : 0;
  const journalRhythm = calculateJournalRhythm(journalEntries);
  const metrics = buildMetrics({
    latestScore: latest?.beingScore ?? null,
    averageScore,
    trend,
    volatility,
    integrationDebt,
    journalRhythm,
    weakestPillar,
    strongestPillar,
    totalCheckIns: sorted.length,
  });

  return {
    metrics,
    pillarAverages,
    latestScore: latest?.beingScore ?? null,
    averageScore,
    trend: roundToTenth(trend),
    volatility,
    integrationDebt,
    journalRhythm,
    weakestPillar,
    strongestPillar,
    timeline: sorted.map((item) => ({
      date: formatDateKey(getCheckInDateKey(item)),
      score: item.beingScore,
    })),
    localAnalysis: buildLocalAnalysis({
      averageScore,
      trend,
      integrationDebt,
      journalRhythm,
      weakestPillar,
      strongestPillar,
    }),
  };
}

function buildMetrics({
  latestScore,
  averageScore,
  trend,
  volatility,
  integrationDebt,
  journalRhythm,
  weakestPillar,
  strongestPillar,
  totalCheckIns,
}: {
  latestScore: number | null;
  averageScore: number | null;
  trend: number;
  volatility: number;
  integrationDebt: number;
  journalRhythm: number;
  weakestPillar: PillarName | null;
  strongestPillar: PillarName | null;
  totalCheckIns: number;
}): BeingMetric[] {
  return [
    {
      label: "Current Being",
      value: latestScore === null ? "-" : latestScore.toFixed(1),
      detail:
        latestScore === null
          ? "Complete a check-in to establish your current state."
          : "Your most recent integrated state score.",
    },
    {
      label: "Average Being",
      value: averageScore === null ? "-" : averageScore.toFixed(1),
      detail: `${totalCheckIns} check-in${totalCheckIns === 1 ? "" : "s"} shaping this reading.`,
    },
    {
      label: "Being Trend",
      value: trend > 0.2 ? `+${trend.toFixed(1)}` : trend < -0.2 ? trend.toFixed(1) : "Stable",
      detail:
        trend > 0.2
          ? "Your recorded Being is rising over time."
          : trend < -0.2
            ? "Your recorded Being is asking for repair and attention."
            : "Your recorded Being is holding a steady range.",
    },
    {
      label: "Integration Debt",
      value: integrationDebt.toFixed(1),
      detail:
        integrationDebt > 2
          ? "A wide gap exists between your strongest and weakest pillar."
          : "Your pillars are relatively close in strength.",
    },
    {
      label: "State Volatility",
      value: volatility.toFixed(1),
      detail:
        volatility > 1.4
          ? "Your state has been swinging. Look for repeat triggers."
          : "Your state is showing a workable level of consistency.",
    },
    {
      label: "Journal Rhythm",
      value: `${journalRhythm}%`,
      detail: "Saved journal entries across the last seven days.",
    },
    {
      label: "Strongest Pillar",
      value: strongestPillar ?? "-",
      detail: strongestPillar
        ? `${strongestPillar} is carrying the most coherence.`
        : "Complete check-ins to reveal this.",
    },
    {
      label: "Growth Edge",
      value: weakestPillar ?? "-",
      detail: weakestPillar
        ? `${weakestPillar} is where the debt of alignment is most visible.`
        : "Complete check-ins to reveal this.",
    },
  ];
}

function buildLocalAnalysis({
  averageScore,
  trend,
  integrationDebt,
  journalRhythm,
  weakestPillar,
  strongestPillar,
}: {
  averageScore: number | null;
  trend: number;
  integrationDebt: number;
  journalRhythm: number;
  weakestPillar: PillarName | null;
  strongestPillar: PillarName | null;
}): BeingDashboardAnalysis {
  if (averageScore === null) {
    return {
      archetype: "Unmeasured State",
      summary:
        "ClearPth needs at least one check-in to begin reading the shape of your Being.",
      rootCause:
        "The root cause is not yet visible because no check-in pattern has been recorded.",
      hiddenDebt:
        "The first debt is visibility: the state cannot be refined until it is named.",
      leveragePoint:
        "Complete one check-in and one journal entry today.",
      nextPractice:
        "Name one thought, one action, and one feeling before the day ends.",
    };
  }

  return {
    archetype: getArchetype(averageScore, trend, integrationDebt),
    summary: `Your Being is averaging ${averageScore.toFixed(1)} with ${strongestPillar ?? "one pillar"} carrying the most force and ${weakestPillar ?? "one pillar"} asking for refinement.`,
    rootCause: getRootCause({
      averageScore,
      trend,
      integrationDebt,
      journalRhythm,
      weakestPillar,
    }),
    hiddenDebt:
      integrationDebt > 2
        ? `The main debt is imbalance: ${weakestPillar} is lagging behind the rest of the system.`
        : "The main debt is subtle: your pillars are not far apart, so the work is consistency rather than overhaul.",
    leveragePoint:
      journalRhythm < 60
        ? "Use the daily journal to make self-honesty a visible rhythm."
        : `Let ${strongestPillar ?? "your strongest pillar"} support direct repair in ${weakestPillar ?? "your weakest pillar"}.`,
    nextPractice:
      trend < -0.2
        ? "Choose one stabilizing action for the next 24 hours and remove one draining input."
        : "Choose one visible action that proves your chosen Being before the day becomes noisy.",
  };
}

function getRootCause({
  averageScore,
  trend,
  integrationDebt,
  journalRhythm,
  weakestPillar,
}: {
  averageScore: number;
  trend: number;
  integrationDebt: number;
  journalRhythm: number;
  weakestPillar: PillarName | null;
}) {
  if (averageScore < 5 && journalRhythm < 50) {
    return "The likely root cause is low continuity: the chosen identity is not yet being reinforced by a daily rhythm.";
  }

  if (integrationDebt > 2) {
    return `The likely root cause is pillar imbalance: ${weakestPillar ?? "one pillar"} is not receiving enough direct attention to support the whole state.`;
  }

  if (trend < -0.2) {
    return "The likely root cause is state leakage over time: your energy is being spent faster than it is being consciously restored.";
  }

  if (averageScore < 6.5) {
    return "The likely root cause is partial alignment: thought, action, and feeling are close enough to sense the right path, but not yet unified enough to carry momentum.";
  }

  return "The root cause is subtle refinement: the system is functioning, but the next level depends on consistency, precision, and fewer internal contradictions.";
}

function buildPillarAverages(items: CheckInResult[]) {
  return {
    Thinking: average(items.map((item) => item.thinkingScore)),
    Willing: average(items.map((item) => item.willingScore)),
    Feeling: average(items.map((item) => item.feelingScore)),
  } satisfies Record<PillarName, number>;
}

function calculateJournalRhythm(journalEntries: JournalEntry[]) {
  if (journalEntries.length === 0) return 0;

  const dates = new Set(
    journalEntries
      .filter((entry) => entry.content.trim())
      .map((entry) => entry.date),
  );
  const today = new Date();
  let completedDays = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - offset);
    if (dates.has(toDateKey(cursor))) completedDays += 1;
  }

  return Math.round((completedDays / 7) * 100);
}

function getArchetype(score: number, trend: number, debt: number) {
  if (score >= 8.5 && debt <= 1.2) return "Magnetic Coherence";
  if (score >= 7 && trend > 0.2) return "Ascending Alignment";
  if (debt > 2.5) return "Split Current";
  if (score < 5.5) return "Rebuilding State";
  return "Active Integration";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function formatDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString();
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
