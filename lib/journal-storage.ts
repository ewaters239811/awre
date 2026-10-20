import { createId } from "@/lib/id";
import { toDateKey } from "@/lib/date-key";
import type { JournalEntry } from "@/lib/types";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { goalIdForRecord, primaryManifestation } from "@/lib/manifestations";

const STORAGE_KEY = "clearpth.journalEntries.v1";
export const JOURNAL_CHANGED_EVENT = "clearpth:journal-changed";

export function createEmptyJournalEntry(date = toDateKey(new Date())) {
  const now = new Date().toISOString();

  return {
    id: createId("journal"),
    manifestationId: primaryManifestation(getOnboardingProfile())?.id,
    date,
    content: "",
    createdAt: now,
    updatedAt: now,
  } satisfies JournalEntry;
}

export function getAllJournalEntries(): JournalEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getJournalEntries(
  goalId = primaryManifestation(getOnboardingProfile())?.id,
): JournalEntry[] {
  const profile = getOnboardingProfile();
  if (profile?.manifestations && !goalId) return [];
  return getAllJournalEntries().filter(
    (entry) => !goalId || goalIdForRecord(entry, profile) === goalId,
  );
}

export function getJournalEntryForDate(date: string, goalId?: string) {
  return getJournalEntries(goalId).find((entry) => entry.date === date) ?? null;
}

export function saveJournalEntry(entry: JournalEntry) {
  if (!isBrowser()) return;

  const updated = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  const next = [
    updated,
    ...getAllJournalEntries().filter(
      (item) =>
        item.id !== entry.id &&
        (item.date !== updated.date ||
          goalIdForRecord(item, getOnboardingProfile()) !==
            goalIdForRecord(updated, getOnboardingProfile())),
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitStorageEvent(JOURNAL_CHANGED_EVENT);
}

export function replaceJournalEntries(entries: JournalEntry[]) {
  if (!isBrowser()) return;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  emitStorageEvent(JOURNAL_CHANGED_EVENT);
}

export { toDateKey };

function isBrowser() {
  return typeof window !== "undefined";
}

function emitStorageEvent(name: string) {
  window.dispatchEvent(new Event(name));
}
