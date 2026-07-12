import type { OnboardingProfile } from "@/lib/types";

const STORAGE_KEY = "clearpth.onboardingProfile.v1";
export const ONBOARDING_CHANGED_EVENT = "clearpth:onboarding-changed";

export function createEmptyOnboardingProfile(): OnboardingProfile {
  const now = new Date().toISOString();

  return {
    primaryGoal: "",
    currentChallenge: "",
    desiredState: "",
    practiceStyle: "Balanced reflection and action",
    spiritualOpenness: "Open, but keep it grounded",
    commitmentLevel: "A few minutes most days",
    guidanceTone: "Direct and grounded",
    createdAt: now,
    updatedAt: now,
  };
}

export function getOnboardingProfile() {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isOnboardingProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  if (!isBrowser()) return;

  try {
    const existing = getOnboardingProfile();
    const now = new Date().toISOString();
    const next = {
      ...profile,
      createdAt: existing?.createdAt ?? profile.createdAt ?? now,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitStorageEvent(ONBOARDING_CHANGED_EVENT);
  } catch {
    // If storage is blocked, the rest of the app can still be used.
  }
}

export function clearOnboardingProfile() {
  if (isBrowser()) {
    localStorage.removeItem(STORAGE_KEY);
    emitStorageEvent(ONBOARDING_CHANGED_EVENT);
  }
}

function isOnboardingProfile(value: unknown): value is OnboardingProfile {
  return (
    value !== null &&
    typeof value === "object" &&
    "primaryGoal" in value &&
    "currentChallenge" in value &&
    "desiredState" in value
  );
}

function isBrowser() {
  return typeof window !== "undefined";
}

function emitStorageEvent(name: string) {
  window.dispatchEvent(new Event(name));
}
