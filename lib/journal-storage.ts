import { createId } from "@/lib/id";
import type { JournalEntry } from "@/lib/types";

const STORAGE_KEY = "clearpth.journalEntries.v1";
export const JOURNAL_CHANGED_EVENT = "clearpth:journal-changed";

export function createEmptyJournalEntry(date = toDateKey(new Date())) {
  const now = new Date().toISOString();

  return {
    id: createId("journal"),
    date,
    content: "",
    createdAt: now,
    updatedAt: now,
  } satisfies JournalEntry;
}

export function getJournalEntries(): JournalEntry[] {
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

export function getJournalEntryForDate(date: string) {
  return getJournalEntries().find((entry) => entry.date === date) ?? null;
}

export function saveJournalEntry(entry: JournalEntry) {
  if (!isBrowser()) return;

  const updated = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  const next = [
    updated,
    ...getJournalEntries().filter((item) => item.id !== entry.id),
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

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function emitStorageEvent(name: string) {
  window.dispatchEvent(new Event(name));
}
