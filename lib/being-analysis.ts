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
      label: "Current Score",
      value: latestScore === null ? "-" : latestScore.toFixed(1),
      detail:
        latestScore === null
          ? "Complete a check-in to create your first score."
          : "Your most recent check-in score.",
    },
    {
      label: "Average Score",
      value: averageScore === null ? "-" : averageScore.toFixed(1),
      detail: `${totalCheckIns} check-in${totalCheckIns === 1 ? "" : "s"} shaping this reading.`,
    },
    {
      label: "Score Trend",
      value: trend > 0.2 ? `+${trend.toFixed(1)}` : trend < -0.2 ? trend.toFixed(1) : "Stable",
      detail:
        trend > 0.2
          ? "Your score is rising over time."
          : trend < -0.2
            ? "Your score is lower than before. Use it as information."
            : "Your score is holding steady.",
    },
    {
      label: "Biggest Gap",
      value: integrationDebt.toFixed(1),
      detail:
        integrationDebt > 2
          ? "One area is much lower than the others."
          : "Your scores are fairly close together.",
    },
    {
      label: "Score Swings",
      value: volatility.toFixed(1),
      detail:
        volatility > 1.4
          ? "Your score has been swinging. Look for what keeps causing it."
          : "Your score is fairly consistent.",
    },
    {
      label: "Journal Days",
      value: `${journalRhythm}%`,
      detail: "Saved journal entries across the last seven days.",
    },
    {
      label: "Helping Most",
      value: strongestPillar ?? "-",
      detail: strongestPillar
        ? `${strongestPillar} is helping most.`
        : "Complete check-ins to reveal this.",
    },
    {
      label: "Focus Area",
      value: weakestPillar ?? "-",
      detail: weakestPillar
        ? `${weakestPillar} has the most room to grow.`
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
      archetype: "Not Measured Yet",
      summary:
        "Complete one check-in to start seeing what is going on.",
      rootCause:
        "What is underneath is not visible yet because no check-ins have been recorded.",
      hiddenDebt:
        "The first step is visibility: you cannot change what you have not named.",
      leveragePoint:
        "Complete one check-in and one journal entry today.",
      nextPractice:
        "Name one thought, one action, and one feeling before the day ends.",
    };
  }

  return {
    archetype: getArchetype(averageScore, trend, integrationDebt),
    summary: `Your average score is ${averageScore.toFixed(1)}. ${strongestPillar ?? "One area"} is helping most, and ${weakestPillar ?? "one area"} needs the most attention.`,
    rootCause: getRootCause({
      averageScore,
      trend,
      integrationDebt,
      journalRhythm,
      weakestPillar,
    }),
    hiddenDebt:
      integrationDebt > 2
        ? `The main issue is imbalance: ${weakestPillar} is lagging behind the rest.`
        : "The main issue is consistency. Your scores are close, so small daily choices matter.",
    leveragePoint:
      journalRhythm < 60
        ? "Use the daily journal to be honest with yourself."
        : `Use ${strongestPillar ?? "what is working"} to support ${weakestPillar ?? "your focus area"}.`,
    nextPractice:
      trend < -0.2
        ? "Choose one stabilizing action for the next 24 hours and remove one draining input."
        : "Choose one visible action before the day gets noisy.",
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
    return "The likely reason is lack of daily rhythm: what you want is not being supported by repeatable actions yet.";
  }

  if (integrationDebt > 2) {
    return `The likely reason is imbalance: ${weakestPillar ?? "one area"} needs more direct attention.`;
  }

  if (trend < -0.2) {
    return "The likely reason is energy loss over time: your energy is being spent faster than it is being restored.";
  }

  if (averageScore < 6.5) {
    return "The likely reason is mixed signals: your thoughts, actions, and feelings are close, but not fully working together yet.";
  }

  return "The next step is refinement: things are working, but consistency will make them stronger.";
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
  if (score >= 8.5 && debt <= 1.2) return "Strong And Clear";
  if (score >= 7 && trend > 0.2) return "Improving";
  if (debt > 2.5) return "Uneven";
  if (score < 5.5) return "Needs Focus";
  return "In Progress";
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
