import { NextResponse } from "next/server";
import { buildPersonalizationLens } from "@/lib/personalization-lens";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { AiMeditation, CheckInResult, OnboardingProfile } from "@/lib/types";

type MeditationRequest = {
  result?: CheckInResult;
  onboardingProfile?: OnboardingProfile | null;
};

const fallback: AiMeditation = {
  title: "Return To The Desired State",
  intention: "Slow down, settle your body, and feel the state that matches what you want.",
  durationSeconds: 540,
  script:
    "Let your body settle into this moment.\n\nLet your shoulders soften, and let your jaw release.\n\nTake a slow breath in, and let it leave without forcing anything.\n\nPause here.\n\nNotice the state you brought with you today. You do not need to fix it quickly. You only need enough quiet to see it clearly.\n\nLet the loudest thought move through your awareness without becoming the whole truth.\n\nStay here.\n\nUnder the noise, there is a steadier part of you that already knows what matters.\n\nFeel your feet. Feel your hands. Feel the center of your chest.\n\nLet the desired state become simple in the body. Not dramatic. Not urgent. Just available.\n\nPause here.\n\nNothing outside of you has to change in this moment for clarity to begin. You are practicing the state that can hold the life you want.\n\nTake one more breath.\n\nLet thought, feeling, and action return to one quiet center.\n\nWhen you are ready, come back with more space around what is true.",
  closingPrompt: "What feels clearer now?",
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
        "Create one daily guided meditation tailored to the user's check-in and desired reality.",
        "The meditation should feel spacious, smooth, and unrushed. It does not need to fit inside five minutes.",
        "Let the session take as long as needed to move calmly through the meditation, usually six to nine minutes when read aloud slowly with pauses.",
        "Keep the script between 180 and 320 words.",
        "Write in gentle spoken lines separated by blank lines.",
        "Use flowing breath-length phrases instead of choppy one-word commands.",
        "Add natural pause cues as standalone lines, such as Pause here. Stay here. Take one more breath.",
        "Place a pause cue after every two to four spoken lines so the audio feels spacious and does not rush.",
        "Prefer fewer ideas with more space over a dense script.",
        "Prioritize silence, breath, and embodiment over explanation.",
        "Do not pack the session with too many ideas.",
        "Use a grounded, premium, intimate, calm tone.",
        "The meditation should create clarity, spaciousness, and inner recognition. It should help the user feel the state that belongs to the life they want. It should not feel like homework or a productivity exercise.",
        "Use the user's weakest pillar as the repair focus and strongest pillar as support.",
        "Use Will, Thinking, Feeling, Doing, and Being as subtle internal structure, but do not make the meditation sound like a lecture.",
        "In ClearPth, Will is the user's aim, Doing is the user's actions, and Being is the integrated state.",
        "If the user wants an outer result, guide them into the state, feeling, or identity beneath it without using the word manifestation.",
        "Use plain language when needed: desired reality, current state, gap, clarity, and the person they are becoming.",
        "Avoid overemphasizing next steps, tasks, proof, or immediate action. A gentle clarity cue is enough.",
        "The closingPrompt should ask what feels clearer, what is now obvious, or what the user notices, not what task they will do.",
        "Do not make medical, therapeutic, diagnostic, or guaranteed claims.",
        "Use gender-neutral language by default.",
        "Do not use markdown formatting, bullets, numbering, headings, or labels inside JSON values.",
        "Return only valid JSON with keys: title, intention, durationSeconds, script, closingPrompt.",
        "durationSeconds must be between 360 and 720.",
      ].join(" "),
      user: {
        thinkingScore: result.thinkingScore,
        doingScore: result.willingScore,
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
