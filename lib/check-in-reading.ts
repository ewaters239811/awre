import { buildAiReadingSignature } from "@/lib/ai-reading-signature";
import { goalIdForRecord, profileForCheckIn } from "@/lib/manifestations";
import { toDateKey } from "@/lib/date-key";
import type {
  CheckInResult,
  JournalEntry,
  OnboardingProfile,
} from "@/lib/types";

export function buildCheckInReading(
  result: CheckInResult,
  profile: OnboardingProfile | null,
  journals: JournalEntry[],
) {
  const goalId = goalIdForRecord(result, profile);
  const entries = journals
    .filter(
      (entry) =>
        goalIdForRecord(entry, profile) === goalId && entry.content.trim(),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const created = new Date(result.createdAt);
  const linked = entries.find((entry) =>
    result.journalEntryId
      ? entry.id === result.journalEntryId
      : !Number.isNaN(created.getTime()) && entry.date === toDateKey(created),
  );
  // Preserve the submitted snapshot; recover old check-ins from their saved goal/day journal.
  const readingResult =
    !result.checkInJournal?.trim() && linked
      ? { ...result, checkInJournal: linked.content, journalEntryId: linked.id }
      : result;
  const recent = (
    linked
      ? [linked, ...entries.filter((entry) => entry.id !== linked.id)]
      : entries
  ).slice(0, 8);
  const onboardingProfile = profileForCheckIn(profile, readingResult);
  return {
    signature: buildAiReadingSignature({
      result: readingResult,
      onboardingProfile,
      journalEntries: recent,
    }),
    request: {
      result: readingResult,
      onboardingProfile,
      journalForCheckIn: linked
        ? { date: linked.date, content: linked.content }
        : null,
      recentJournalEntries: recent.map(({ date, content }) => ({
        date,
        content,
      })),
    },
  };
}
