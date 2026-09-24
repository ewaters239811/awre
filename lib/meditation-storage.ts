const STORAGE_KEY = "clearpth.meditationCompletions.v1";
export const MEDITATION_COMPLETED_EVENT = "clearpth:meditation-completed";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getMeditationCompletions() {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function hasMeditationCompletionForDate(dateKey: string) {
  return getMeditationCompletions().includes(dateKey);
}

export function markMeditationCompleted(dateKey: string) {
  if (!isBrowser()) return;

  const next = Array.from(new Set([dateKey, ...getMeditationCompletions()]));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(MEDITATION_COMPLETED_EVENT));
  } catch {
    // Storage can be unavailable in some browser modes.
  }
}

export function clearMeditationCompletions() {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(MEDITATION_COMPLETED_EVENT));
  } catch {
    // Storage can be unavailable in some browser modes.
  }
}
