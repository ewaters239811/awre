import { NextResponse } from "next/server";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { AiAlignment, CheckInResult } from "@/lib/types";

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
    const result = (await request.json()) as CheckInResult;

    const ai = await createJsonWithOpenAI<AiAlignment>({
      fallback,
      system: [
        "You write for ClearPth, a self-reflection and personal growth app.",
        "ClearPth is not medical, therapy, diagnostic, or crisis support.",
        "Create a personalized alignment result using the user's scores and answers.",
        "Use a premium, grounded, mystical, clean tone without sounding clinical.",
        "Look for the root issue beneath the user's surface answers: the desired feeling, identity, shadow pattern, projection, unmet need, or avoided inner shift.",
        "Use Jungian psychology lightly as a lens for integration, shadow, persona, projection, and self-recognition without sounding academic.",
        "Frame manifestation as becoming emotionally independent from outer confirmation: the user practices the state they seek before reality visibly changes.",
        "If the user's desire is external, translate it into the inner feeling or identity it represents, then give a practical action from that state.",
        "Do not imply blame for difficult circumstances. Keep the focus on agency, emotional charge, and the next honest inner correction.",
        "Use gender-neutral language by default: say person, self, life, presence, or identity rather than man, woman, masculine, feminine, he, she, his, or her.",
        "Only use gendered language if the user explicitly states their gender or asks you to reflect it.",
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
