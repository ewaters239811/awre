import type { CheckInDraft, CheckInResult, PillarName } from "@/lib/types";
import { createId } from "@/lib/id";
import { toDateKey } from "@/lib/date-key";

const STORAGE_KEY = "aura.checkIns.v1";
export const CHECK_INS_CHANGED_EVENT = "clearpth:check-ins-changed";

type PillarScore = {
  name: PillarName;
  score: number;
};

export function buildResult(draft: CheckInDraft): CheckInResult {
  const pillars: PillarScore[] = [
    { name: "Thinking", score: draft.thinkingScore },
    { name: "Willing", score: draft.willingScore },
    { name: "Feeling", score: draft.feelingScore },
  ];
  const beingScore = roundToTenth(
    (draft.thinkingScore + draft.willingScore + draft.feelingScore) / 3,
  );
  const strongestPillar = [...pillars].sort((a, b) => b.score - a.score)[0].name;
  const weakestPillar = [...pillars].sort((a, b) => a.score - b.score)[0].name;

  return {
    ...draft,
    id: createId("check-in"),
    createdAt: new Date().toISOString(),
    beingScore,
    stateLabel: getStateLabel(beingScore),
    strongestPillar,
    weakestPillar,
    prescription: buildPrescription(draft, weakestPillar),
  };
}

export function getStateLabel(score: number) {
  if (score < 4) return "Fragmented State";
  if (score < 6) return "Unstable State";
  if (score < 7.5) return "Awakening State";
  if (score < 9) return "Aligned State";
  return "Magnetic State";
}

export function getCheckIns(): CheckInResult[] {
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

export function saveCheckIn(result: CheckInResult) {
  if (!isBrowser()) return;
  const resultDate = toDateKey(new Date(result.createdAt));
  const existing = getCheckIns().filter(
    (item) => toDateKey(new Date(item.createdAt)) !== resultDate,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...existing]));
  emitStorageEvent(CHECK_INS_CHANGED_EVENT);
}

export function getCheckInById(id: string) {
  return getCheckIns().find((item) => item.id === id) ?? null;
}

export function getCheckInForDate(date: string) {
  return (
    getCheckIns().find((item) => toDateKey(new Date(item.createdAt)) === date) ??
    null
  );
}

export function getTodaysCheckIn() {
  return getCheckInForDate(toDateKey(new Date()));
}

export function getLatestCheckIn() {
  return getCheckIns()[0] ?? null;
}

export function updateCheckIn(updated: CheckInResult) {
  if (!isBrowser()) return;
  const next = getCheckIns().map((item) =>
    item.id === updated.id ? updated : item,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitStorageEvent(CHECK_INS_CHANGED_EVENT);
}

export function clearCheckIns() {
  if (isBrowser()) {
    localStorage.removeItem(STORAGE_KEY);
    emitStorageEvent(CHECK_INS_CHANGED_EVENT);
  }
}

export function replaceCheckIns(results: CheckInResult[]) {
  if (!isBrowser()) return;
  const sorted = [...results].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  emitStorageEvent(CHECK_INS_CHANGED_EVENT);
}

function buildPrescription(
  draft: CheckInDraft,
  weakestPillar: PillarName,
): CheckInResult["prescription"] {
  const highestChoice =
    draft.highestBeingChoice.trim() || "one clear, honorable move";

  const byWeakest: Record<PillarName, CheckInResult["prescription"]> = {
    Thinking: {
      thoughtCorrection:
        "Replace the dominant thought with a cleaner command: I can see this clearly and choose the next true step.",
      actionStep: `Give ${highestChoice} a visible form within the next hour.`,
      embodimentPractice:
        "Stand tall, slow your breath, and let your eyes soften before making the next decision.",
      identityAffirmation:
        "I am the one who brings my mind into order before my day demands it.",
    },
    Willing: {
      thoughtCorrection:
        "Stop negotiating with avoided action; reduce it to the smallest honorable movement.",
      actionStep:
        "Take a ten-minute first pass on the action you named, before seeking more clarity.",
      embodimentPractice:
        "Put both feet on the floor, exhale fully, and move before the old pattern finishes speaking.",
      identityAffirmation:
        "I am the one who converts inner knowing into clean action.",
    },
    Feeling: {
      thoughtCorrection:
        "Let the feeling inform you without appointing it as your ruler.",
      actionStep: `Choose ${highestChoice} while carrying the feeling with steadiness.`,
      embodimentPractice:
        "Breathe into the center of the chest for ninety seconds and relax the jaw and shoulders.",
      identityAffirmation:
        "I am the one who charges my identity with faith, restraint, and presence.",
    },
  };

  return byWeakest[weakestPillar];
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function emitStorageEvent(name: string) {
  window.dispatchEvent(new Event(name));
}
