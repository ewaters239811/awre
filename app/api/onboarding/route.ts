import { NextResponse } from "next/server";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { OnboardingProfile } from "@/lib/types";

type OnboardingRequest = {
  intake?: string;
};

type OnboardingProfileDraft = Pick<
  OnboardingProfile,
  | "primaryGoal"
  | "currentChallenge"
  | "desiredState"
  | "practiceStyle"
  | "spiritualOpenness"
  | "commitmentLevel"
  | "guidanceTone"
>;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingRequest;
    const intake = body.intake?.trim() ?? "";
    const fallback = buildFallbackProfile(intake);

    if (!intake) {
      return NextResponse.json(
        { enabled: false, data: fallback, error: "Missing onboarding intake." },
        { status: 200 },
      );
    }

    const response = await createJsonWithOpenAI<OnboardingProfileDraft>({
      fallback,
      maxOutputTokens: 650,
      system: [
        "You create ClearPth onboarding profiles from a user's natural language intake.",
        "ClearPth helps users close the gap between their current state and desired reality.",
        "Extract the user's desired reality, current gap, desired inner state, and preferred support style.",
        "Do not overcomplicate. Make the profile clear, practical, and emotionally accurate.",
        "Use gender-neutral language by default unless the user states gender.",
        "Do not make medical, therapeutic, diagnostic, or guaranteed claims.",
        "Return only valid JSON with keys: primaryGoal, currentChallenge, desiredState, practiceStyle, spiritualOpenness, commitmentLevel, guidanceTone.",
        "primaryGoal should be a smooth concise statement of what the user wants.",
        "currentChallenge should name the main gap or repeated pattern in plain language.",
        "desiredState should name the state or identity the user wants to live from.",
        "practiceStyle must be one of: Balanced reflection and action, More practical action, More inner reflection, Short and direct.",
        "spiritualOpenness must be one of: Open, but keep it grounded, Very open to mystical language, Mostly practical and psychological.",
        "commitmentLevel must be one of: A few minutes most days, Daily check-ins, Deep weekly reflection, Still exploring.",
        "guidanceTone must be one of: Direct and grounded, Gentle and reflective, Strong and challenging, Practical and concise.",
      ].join(" "),
      user: {
        intake,
      },
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      {
        enabled: false,
        data: buildFallbackProfile(""),
        error: "Onboarding profile generation failed.",
      },
      { status: 200 },
    );
  }
}

function buildFallbackProfile(intake: string): OnboardingProfileDraft {
  const trimmed = intake.trim();
  const defaultGoal = trimmed || "I want to become more aligned with the life I want.";

  return {
    primaryGoal: defaultGoal,
    currentChallenge:
      "The current gap needs to be named more clearly through check-ins and reflection.",
    desiredState: "Clear, steady, honest, and aligned.",
    practiceStyle: "Balanced reflection and action",
    spiritualOpenness: "Open, but keep it grounded",
    commitmentLevel: "A few minutes most days",
    guidanceTone: "Direct and grounded",
  };
}
