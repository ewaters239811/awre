import { NextResponse } from "next/server";
import { buildPersonalizationLens } from "@/lib/personalization-lens";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { AiMeditation, CheckInResult, OnboardingProfile } from "@/lib/types";

type MeditationRequest = {
  result?: CheckInResult;
  onboardingProfile?: OnboardingProfile | null;
};

const fallback: AiMeditation = {
  title: "Return To The Center",
  intention: "Bring thought, action, and feeling back into one clean direction.",
  durationSeconds: 300,
  script:
    "Sit comfortably and let your shoulders drop. Take a slow breath in, and a slower breath out. Let the mind become simple. You do not need to solve the whole life from here. You only need to return to the state that can meet the next moment clearly. Notice the thought that has been taking the most space. Let it soften into one cleaner sentence: I can see what is here, and I can choose one true step. Now bring attention to the body. Feel your feet, your hands, your jaw, and the center of the chest. Let the body learn steadiness before the day asks for performance. If action has been delayed, do not judge it. See the delay as stored energy waiting for a clean direction. Imagine one small action becoming natural, visible, and complete. Now let the feeling underneath the day be present without letting it lead. Breathe as if your desired state is already allowed in the body. You are not waiting for the outside world to give you permission to become steady. You are practicing the state now. For the final breaths, gather thinking, willing, and feeling into one quiet line. One thought. One step. One state. When you are ready, open your eyes and carry that line into the next action.",
  closingPrompt:
    "What one action would prove this state in the next hour?",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MeditationRequest;
    const result = body.result;

    if (!result) {
      return NextResponse.json(
        { enabled: false, data: fallback, error: "Missing check-in result." },
        { status: 200 },
      );
    }

    const onboardingProfile = body.onboardingProfile ?? null;
    const personalizationLens = buildPersonalizationLens(onboardingProfile);
    const response = await createJsonWithOpenAI<AiMeditation>({
      fallback,
      maxOutputTokens: 950,
      system: [
        "You write guided meditations for ClearPth, a self-reflection and personal growth app.",
        "ClearPth is not medical, therapy, diagnostic, or crisis support.",
        "Create one daily guided meditation tailored to the user's check-in.",
        "The meditation must be no more than five minutes when read aloud at a calm pace.",
        "Keep the script between 420 and 560 words.",
        "Use a grounded, premium, intimate, calm tone.",
        "Use the user's weakest pillar as the repair focus and strongest pillar as support.",
        "Use Thinking, Willing, Feeling, and Being as subtle internal structure, but do not make the meditation sound like a lecture.",
        "If the user wants an outer result, guide them into the state, feeling, or identity beneath it without using the word manifestation.",
        "Do not make medical, therapeutic, diagnostic, or guaranteed claims.",
        "Use gender-neutral language by default.",
        "Do not use markdown formatting, bullets, numbering, headings, or labels inside JSON values.",
        "Return only valid JSON with keys: title, intention, durationSeconds, script, closingPrompt.",
        "durationSeconds must be 300 or less.",
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
      },
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { enabled: false, data: fallback, error: "Meditation generation failed." },
      { status: 200 },
    );
  }
}
