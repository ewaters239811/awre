import { goalIdForRecord, primaryManifestation } from "@/lib/manifestations";
import { getCheckInDateKey } from "@/lib/alignment";
import { toDateKey } from "@/lib/date-key";
import type {
  CheckInResult,
  HomeGapEvidence,
  JournalEntry,
  OnboardingProfile,
} from "@/lib/types";

export function getHomeNextAction({
  hasFocus,
  checkedIn,
  readToday,
  meditated,
}: {
  hasFocus: boolean;
  checkedIn: boolean;
  readToday: boolean;
  meditated: boolean;
}) {
  if (!hasFocus)
    return {
      kind: "focus",
      label: "Choose Your Desired Reality",
      href: "/manifestations",
    } as const;
  if (!checkedIn)
    return { kind: "check-in", label: "Check in", href: "/check-in" } as const;
  if (!readToday)
    return {
      kind: "read",
      label: "Read your reflection",
      href: "/review",
    } as const;
  if (!meditated)
    return {
      kind: "tune-in",
      label: "Start your Tune In",
      href: "/tune-in",
    } as const;
  return { kind: "complete", label: "Your day is complete" } as const;
}

export function buildHomeScoreInsight(
  checkIns: CheckInResult[],
  profile: OnboardingProfile | null,
  todayKey: string,
) {
  const goal = primaryManifestation(profile);
  const day = new Date(`${todayKey}T12:00:00`);
  if (!goal || Number.isNaN(day.getTime())) return null;
  const start = new Date(day);
  start.setDate(start.getDate() - 6);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 7);
  const recentStart = toDateKey(start);
  const olderStart = toDateKey(previousStart);
  const days = new Map<string, number>();
  // One reflection per goal/day; duplicate imports must not inflate the comparison.
  const sorted = [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const item of sorted) {
    if (
      goalIdForRecord(item, profile) !== goal.id ||
      Number.isNaN(new Date(item.createdAt).getTime())
    ) continue;
    const scores = [item.thinkingScore, item.willingScore, item.feelingScore];
    if (!scores.every((score) => Number.isFinite(score) && score >= 1 && score <= 10))
      continue;
    const key = getCheckInDateKey(item);
    if (key < olderStart || key > todayKey || days.has(key)) continue;
    days.set(key, scores.reduce((sum, score) => sum + score, 0) / 3);
  }
  const recent: number[] = [];
  const previous: number[] = [];
  for (const [key, score] of days)
    (key >= recentStart ? recent : previous).push(score);
  if (recent.length < 3 || previous.length < 3) return null;
  const average = (scores: number[]) =>
    scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const currentAverage = average(recent);
  const previousAverage = average(previous);
  const difference = Math.round((currentAverage - previousAverage) * 10) / 10;
  return {
    text:
      Math.abs(difference) < 0.2
        ? "Your average is similar to last week."
        : `Your average is ${Math.abs(difference).toFixed(1)} ${difference > 0 ? "higher" : "lower"} than last week.`,
    currentAverage,
    previousAverage,
    currentCount: recent.length,
    previousCount: previous.length,
  };
}

export function buildHomeAlignmentContext(
  checkIns: CheckInResult[],
  journals: JournalEntry[],
  profile: OnboardingProfile | null,
) {
  const goal = primaryManifestation(profile);
  const items = checkIns
    .filter(
      (item) =>
        Boolean(goal) &&
        goalIdForRecord(item, profile) === goal?.id &&
        [item.thinkingScore, item.willingScore, item.feelingScore].every(
          (score) => Number.isFinite(score) && score >= 1 && score <= 10,
        ),
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    );
  const entries = journals
    .filter(
      (entry) =>
        Boolean(goal) &&
        goalIdForRecord(entry, profile) === goal?.id &&
        entry.content.trim(),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const sources = items.map((item) => ({
    id: item.id,
    date: item.createdAt,
    thinking: item.thinkingScore,
    acting: item.willingScore,
    feeling: item.feelingScore,
    thought: item.dominantThought,
    action: item.avoidedAction,
    feelingText: item.currentFeeling,
    choice: item.highestBeingChoice,
    ...(item.checkInJournal ? { checkInJournal: item.checkInJournal } : {}),
  }));
  const journalSources = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    content: entry.content,
    action: entry.alignedAction ?? "",
    completed: Boolean(entry.alignedActionCompletedAt),
  }));
  const averages = {
    thinking: items.length
      ? items.reduce((sum, item) => sum + item.thinkingScore, 0) / items.length
      : 0,
    acting: items.length
      ? items.reduce((sum, item) => sum + item.willingScore, 0) / items.length
      : 0,
    feeling: items.length
      ? items.reduce((sum, item) => sum + item.feelingScore, 0) / items.length
      : 0,
  };
  const signatureSource = JSON.stringify({
    // Refresh older, longer notes once; subsequent reads still use the saved note.
    version: 2,
    goalId: goal?.id,
    outcome: goal?.outcome,
    identity: goal?.identity,
    foundation: profile?.manifestations?.innerFoundation,
    sources,
    journalSources,
  });
  let hash = 2166136261;
  for (let i = 0; i < signatureSource.length; i++)
    hash = Math.imul(hash ^ signatureSource.charCodeAt(i), 16777619);
  return {
    signature: `home-gap-v2-${(hash >>> 0).toString(16)}`,
    resultId: items[0]?.id ?? null,
    goalId: goal?.id ?? null,
    desiredReality: goal?.outcome ?? "",
    identity: goal?.identity ?? "",
    innerFoundation: profile?.manifestations?.innerFoundation ?? "",
    checkInCount: items.length,
    journalCount: entries.length,
    averages,
    // Full-history scores establish the pattern; excerpts give it personal context.
    reflections: sources.slice(0, 24).map((item) => ({
      ...item,
      thought: item.thought.slice(0, 500),
      action: item.action.slice(0, 500),
      feelingText: item.feelingText.slice(0, 500),
      choice: item.choice.slice(0, 500),
      ...(item.checkInJournal
        ? { checkInJournal: item.checkInJournal.slice(0, 1200) }
        : {}),
    })),
    journals: journalSources
      .slice(0, 24)
      .map((entry) => ({ ...entry, content: entry.content.slice(0, 1200) })),
  };
}

export type HomeAlignmentContext = ReturnType<typeof buildHomeAlignmentContext>;

export function cleanHomeGapEvidence(
  value: unknown,
  context: HomeAlignmentContext,
): HomeGapEvidence[] {
  if (!Array.isArray(value)) return [];
  const evidence: HomeGapEvidence[] = [];
  const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
  for (const candidate of value.slice(0, 8)) {
    if (
      !candidate ||
      typeof candidate.sourceId !== "string" ||
      typeof candidate.excerpt !== "string"
    ) continue;
    const excerpt = normalize(candidate.excerpt);
    if (
      excerpt.length < 12 ||
      excerpt.length > 200 ||
      evidence.some((item) =>
        item.excerpt === excerpt ||
        (item.source === candidate.source && item.sourceId === candidate.sourceId),
      )
    ) continue;
    const reflection =
      candidate.source === "check-in"
        ? context.reflections.find((item) => item.id === candidate.sourceId)
        : null;
    const journal =
      candidate.source === "journal"
        ? context.journals.find((item) => item.id === candidate.sourceId)
        : null;
    const sources = reflection
      ? [
          reflection.thought,
          reflection.action,
          reflection.feelingText,
          reflection.choice,
          reflection.checkInJournal ?? "",
        ]
      : journal ? [journal.content] : [];
    if (!sources.some((text) => normalize(text).includes(excerpt))) continue;
    evidence.push({ source: candidate.source, sourceId: candidate.sourceId, excerpt });
    if (evidence.length === 2) break;
  }
  return evidence;
}

export function fallbackHomeGap(context: HomeAlignmentContext) {
  if (!context.resultId)
    return "Your first check-in is the starting point for seeing the distance between your current state and desired reality.";
  const sorted = Object.entries(context.averages).sort((a, b) => a[1] - b[1]);
  if (sorted[0][1] >= 8.5)
    return "Your reflections show strong inner alignment; consistency is now the practice to protect.";
  if (sorted[2][1] - sorted[0][1] < 0.5)
    return "No single gap stands apart yet; your reflections are still bringing the pattern into focus.";
  if (sorted[0][0] === "acting")
    return "You rated action lower than thoughts and feelings; that may be a useful place to reflect.";
  if (sorted[0][0] === "thinking")
    return "You rated thoughts lower than feelings and actions; notice which beliefs support your desired reality.";
  return "You rated feelings lower than thoughts and actions; notice what would help you feel more supported.";
}

export function cleanHomeGap(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[*#`]/g, "").replace(/\s+/g, " ").trim();
  const sentence = text.split(/(?<=[.!?])\s+/)[0];
  if (
    !sentence ||
    sentence.length > 180 ||
    sentence.split(/\s+/).length > 22 ||
    sentence.split(/\s+/).length < 5 ||
    /<[^>]+>/.test(sentence)
  )
    return null;
  return sentence;
}
