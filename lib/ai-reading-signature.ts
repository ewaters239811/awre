import type { CheckInResult, JournalEntry, OnboardingProfile } from "@/lib/types";

export function buildAiReadingSignature({
  result,
  onboardingProfile,
  journalEntries,
}: {
  result: CheckInResult;
  onboardingProfile: OnboardingProfile | null;
  journalEntries: JournalEntry[];
}) {
  const checkInSignal = [
    result.id,
    result.createdAt,
    result.checkInDate ?? "",
    result.thinkingScore,
    result.willingScore,
    result.feelingScore,
    result.dominantThought.trim(),
    result.avoidedAction.trim(),
    result.currentFeeling.trim(),
    result.highestBeingChoice.trim(),
  ].join("|");

  const journalSignal = journalEntries
    .slice(0, 8)
    .map((entry) =>
      [entry.id, entry.date, entry.content.trim()].join("|"),
    )
    .join("::");

  const profileSignal = onboardingProfile
    ? [
        onboardingProfile.primaryGoal,
        onboardingProfile.currentChallenge,
        onboardingProfile.desiredState,
        onboardingProfile.birthDate ?? "",
        onboardingProfile.practiceStyle,
        onboardingProfile.spiritualOpenness,
        onboardingProfile.commitmentLevel,
        onboardingProfile.guidanceTone,
      ].join("|")
    : "no-profile";

  return simpleHash(`${checkInSignal}--${journalSignal}--${profileSignal}`);
}

function simpleHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return String(hash >>> 0);
}
