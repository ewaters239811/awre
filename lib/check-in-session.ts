import { buildResult, saveCheckIn } from "@/lib/alignment";
import {
  saveCheckInToAccount,
  saveJournalEntryToAccount,
} from "@/lib/account-data";
import {
  createEmptyJournalEntry,
  saveJournalEntry,
} from "@/lib/journal-storage";
import type {
  CheckInDraft,
  CheckInResult,
  JournalEntry,
  ManifestationGoal,
} from "@/lib/types";

export const CHECK_IN_JOURNAL_LIMIT = 8000;

export type CheckInSession = { result: CheckInResult; journal: JournalEntry };

export function createJournalReflection({
  content,
  goalId,
  journalDate,
  existingJournal,
}: {
  content: string;
  goalId: string;
  journalDate: string;
  existingJournal: JournalEntry | null;
}): JournalEntry {
  const text = content.trim();
  if (!text)
    throw new Error("Write a little about your day before continuing.");
  if (text.length > CHECK_IN_JOURNAL_LIMIT)
    throw new Error("Please keep your entry to 8,000 characters or fewer.");
  if (
    existingJournal &&
    (existingJournal.date !== journalDate ||
      (existingJournal.manifestationId &&
        existingJournal.manifestationId !== goalId))
  )
    throw new Error(
      "This journal belongs to a different day or desired reality.",
    );
  const base = existingJournal ?? createEmptyJournalEntry(journalDate);
  return {
    ...base,
    manifestationId: goalId,
    date: journalDate,
    content: base.content.trim()
      ? `${base.content.trimEnd()}\n\n${text}`
      : text,
    updatedAt: new Date().toISOString(),
  };
}

export function createCheckInSession({
  scores,
  content,
  goal,
  innerFoundation,
  existingJournal,
  journalDate,
}: {
  scores: Pick<CheckInDraft, "thinkingScore" | "willingScore" | "feelingScore">;
  content: string;
  goal: ManifestationGoal;
  innerFoundation?: string;
  existingJournal: JournalEntry | null;
  journalDate: string;
}): CheckInSession {
  const text = content.trim();
  const journal = createJournalReflection({
    content,
    goalId: goal.id,
    journalDate,
    existingJournal,
  });
  const result = buildResult({
    ...scores,
    manifestationId: goal.id,
    desiredReality: goal.outcome,
    innerFoundation,
    checkInJournal: text,
    journalEntryId: journal.id,
    // Retain the old fields so historical records and existing consumers stay compatible.
    dominantThought: "",
    avoidedAction: "",
    currentFeeling: "",
    highestBeingChoice: "",
  });
  return { result, journal };
}

export async function saveCheckInSession(session: CheckInSession) {
  // Save the writing first. A failed check-in can retry the same IDs without appending it twice.
  await saveJournalEntryToAccount(session.journal);
  saveJournalEntry(session.journal);
  await saveCheckInToAccount(session.result);
  saveCheckIn(session.result);
}
