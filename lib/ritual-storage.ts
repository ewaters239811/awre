import type { DailyRitual } from "@/lib/types";
import { createId } from "@/lib/id";

const STORAGE_KEY = "aura.dailyRituals.v1";

export function createEmptyRitual(date = toDateKey(new Date())): DailyRitual {
  const now = new Date().toISOString();

  return {
    id: createId("ritual"),
    date,
    morningIntention: "",
    chosenBeing: "",
    protectedBoundary: "",
    eveningAlignment: "",
    eveningFragmentation: "",
    lesson: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function getRituals(): DailyRitual[] {
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

export function getRitualForDate(date: string) {
  return getRituals().find((ritual) => ritual.date === date) ?? null;
}

export function saveRitual(ritual: DailyRitual) {
  if (!isBrowser()) return;

  const updated = {
    ...ritual,
    updatedAt: new Date().toISOString(),
  };
  const next = [
    updated,
    ...getRituals().filter((item) => item.id !== ritual.id),
  ].sort((a, b) => b.date.localeCompare(a.date));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
