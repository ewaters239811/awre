import { NextResponse } from "next/server";
import { buildPersonalizationLens } from "@/lib/personalization-lens";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { AiAlignment, CheckInResult, OnboardingProfile } from "@/lib/types";

type PersonalizeRequest =
  | CheckInResult
  | {
      result?: CheckInResult;
      onboardingProfile?: OnboardingProfile | null;
      recentJournalEntries?: Array<{
        date: string;
        content: string;
      }>;
    };

const fallback: AiAlignment = {
  summary:
    "Your alignment result is ready. Use the strongest pillar as support while giving patient attention to the weakest pillar.",
  thoughtCorrection:
    "Choose the cleanest interpretation of your situation and return to it when the mind scatters.",
  actionStep:
    "Take one visible step that makes your highest choice real before the day gets noisy.",
  embodimentPractice:
    "Breathe slowly, relax the jaw and shoulders, and let the body rehearse steadiness.",
  identityAffirmation:
    "I am becoming the person whose thoughts, actions, and feelings can agree.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PersonalizeRequest;
    const result = getPersonalizeResult(body);
    const recentJournalEntries =
      "recentJournalEntries" in body ? body.recentJournalEntries ?? [] : [];
    const onboardingProfile =
      "onboardingProfile" in body ? body.onboardingProfile ?? null : null;
    const personalizationLens = buildPersonalizationLens(onboardingProfile);

    if (!result) {
      return NextResponse.json(
        { enabled: false, data: fallback, error: "Missing check-in result." },
        { status: 200 },
      );
    }

    const ai = await createJsonWithOpenAI<AiAlignment>({
      fallback,
      system: [
        "You write for ClearPth, a self-reflection and personal growth app.",
        "ClearPth is not medical, therapy, diagnostic, or crisis support.",
        "Create a personalized alignment result using the user's scores and answers.",
        "Use a premium, grounded, mystical, clean tone without sounding clinical.",
        "Look for the root issue beneath the user's surface answers: the desired feeling, identity, shadow pattern, projection, unmet need, or avoided inner shift.",
        "If recent journal entries are provided, use them as private context for repeated patterns, emotional charges, avoided actions, and root issue clues.",
        "If an onboarding profile is provided, use it to calibrate the user's goal, preferred tone, commitment level, desired state, and comfort with mystical language.",
        "If a private personalization lens is provided, use it only to subtly tune rhythm, growth edge, and practice style. Never mention numbers, calculations, birthdays, numerology, or that a hidden lens is being used.",
        "Do not quote journal entries at length. Distill them into the current check-in reading.",
        "Use Jungian psychology lightly as a lens for integration, shadow, persona, projection, and self-recognition without sounding academic.",
        "Frame manifestation as becoming emotionally independent from outer confirmation: the user practices the state they seek before reality visibly changes.",
        "If the user's desire is external, translate it into the inner feeling or identity it represents, then give a practical action from that state.",
        "Do not imply blame for difficult circumstances. Keep the focus on agency, emotional charge, and the next honest inner correction.",
        "Use gender-neutral language by default: say person, self, life, presence, or identity rather than man, woman, masculine, feminine, he, she, his, or her.",
        "Only use gendered language if the user explicitly states their gender or asks you to reflect it.",
        "Do not use markdown formatting, bold text, headings, bullets, or numbered lists inside JSON values.",
        "Do not mention diagnoses, treatment, symptoms, disorders, or guarantees.",
        "Return only valid JSON with keys: summary, thoughtCorrection, actionStep, embodimentPractice, identityAffirmation.",
        "Keep each value concise: one or two sentences.",
      ].join(" "),
      user: {
        thinkingScore: result.thinkingScore,
        willingScore: result.willingScore,
        feelingScore: result.feelingScore,
        beingScore: result.beingScore,
        stateLabel: result.stateLabel,
        strongestPillar: result.strongestPillar,
        weakestPillar: result.weakestPillar,
        dominantThought: result.dominantThought,
        avoidedAction: result.avoidedAction,
        currentFeeling: result.currentFeeling,
        highestBeingChoice: result.highestBeingChoice,
        onboardingProfile,
        personalizationLens,
        recentJournalEntries: recentJournalEntries
          .filter((entry) => entry.content.trim())
          .slice(0, 8),
      },
    });

    return NextResponse.json(ai);
  } catch {
    return NextResponse.json(
      { enabled: false, data: fallback, error: "AI personalization failed." },
      { status: 200 },
    );
  }
}

function getPersonalizeResult(body: PersonalizeRequest): CheckInResult | null {
  if ("result" in body) return body.result ?? null;
  return isCheckInResult(body) ? body : null;
}

function isCheckInResult(value: unknown): value is CheckInResult {
  return (
    value !== null &&
    typeof value === "object" &&
    "thinkingScore" in value &&
    "willingScore" in value &&
    "feelingScore" in value &&
    "beingScore" in value
  );
}
