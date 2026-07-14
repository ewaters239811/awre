import type { OnboardingProfile } from "@/lib/types";

export type PersonalizationLens = {
  rhythm: string;
  growthEdge: string;
  alignmentCue: string;
  practiceStyle: string;
};

const lenses: Record<number, Omit<PersonalizationLens, "practiceStyle">> = {
  1: {
    rhythm: "initiating, self-led, and strengthened by decisive movement",
    growthEdge: "waiting for permission when direct self-trust is needed",
    alignmentCue: "choose the smallest honest action that restores authorship",
  },
  2: {
    rhythm: "sensitive, relational, and strengthened by emotional honesty",
    growthEdge: "absorbing the atmosphere around them instead of naming what is true",
    alignmentCue: "separate their feeling from the room and make one calm request",
  },
  3: {
    rhythm: "expressive, imaginative, and strengthened by visible creation",
    growthEdge: "scattering energy across possibilities before one thing is shaped",
    alignmentCue: "turn the mood into one clear sentence, choice, or creation",
  },
  4: {
    rhythm: "structured, practical, and strengthened by simple consistency",
    growthEdge: "making the path too heavy before taking the next plain step",
    alignmentCue: "reduce the day to one grounded commitment that can be completed",
  },
  5: {
    rhythm: "adaptive, curious, and strengthened by fresh movement",
    growthEdge: "mistaking restlessness for guidance before the desire is clarified",
    alignmentCue: "give the energy a clean direction instead of letting it leak",
  },
  6: {
    rhythm: "devoted, responsible, and strengthened by loving boundaries",
    growthEdge: "carrying too much for others while neglecting inner order",
    alignmentCue: "serve from steadiness, not from pressure to prove care",
  },
  7: {
    rhythm: "reflective, discerning, and strengthened by quiet inner truth",
    growthEdge: "retreating into analysis when life is asking for participation",
    alignmentCue: "trust the insight enough to make one embodied move",
  },
  8: {
    rhythm: "powerful, strategic, and strengthened by owned authority",
    growthEdge: "outsourcing worth to outer results, approval, or control",
    alignmentCue: "act from value before the world confirms it",
  },
  9: {
    rhythm: "wide-hearted, integrative, and strengthened by release",
    growthEdge: "holding old emotional stories after the lesson has already arrived",
    alignmentCue: "let the old identity soften so the next one can lead",
  },
};

export function buildPersonalizationLens(
  profile?: OnboardingProfile | null,
): PersonalizationLens | null {
  const birthDate = profile?.birthDate?.trim();
  if (!birthDate) return null;

  const digits = birthDate.replace(/\D/g, "");
  if (digits.length < 6) return null;

  const key = reduceToSingleDigit(
    digits.split("").reduce((total, digit) => total + Number(digit), 0),
  );
  const lens = lenses[key];
  if (!lens) return null;

  return {
    ...lens,
    practiceStyle: profile?.practiceStyle || "Balanced reflection and action",
  };
}

function reduceToSingleDigit(value: number): number {
  let next = value;

  while (next > 9) {
    next = String(next)
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
  }

  return next;
}
