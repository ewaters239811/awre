import { goalIdForRecord, primaryManifestation } from "@/lib/manifestations";
import type {
  CheckInResult,
  JournalEntry,
  OnboardingProfile,
} from "@/lib/types";

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

export function fallbackHomeGap(context: HomeAlignmentContext) {
  if (!context.resultId)
    return "Your first check-in is the starting point for seeing the distance between your current state and desired reality.";
  const sorted = Object.entries(context.averages).sort((a, b) => a[1] - b[1]);
  if (sorted[0][1] >= 8.5)
    return "Your reflections show strong inner alignment; consistency is now the practice to protect.";
  if (sorted[2][1] - sorted[0][1] < 0.5)
    return "No single gap stands apart yet; your reflections are still bringing the pattern into focus.";
  if (sorted[0][0] === "acting")
    return "Your reflections point to a gap between what you intend and what you consistently do.";
  if (sorted[0][0] === "thinking")
    return "Your reflections suggest your thoughts are less aligned with your desired reality than your actions and feelings.";
  return "Your reflections suggest your feelings need more support as your thoughts and actions move toward your desired reality.";
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
