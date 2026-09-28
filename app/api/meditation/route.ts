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
  intention: "Slow down, settle your body, and let clarity rise without force.",
  durationSeconds: 270,
  script:
    "Let the body settle. Let the shoulders drop. Let the jaw soften. Take a slow breath in. Pause. Let it out even slower. Stay here. Let the mind become simple. You do not need to solve everything from here. You only need enough quiet to see clearly. Notice the thought that has been taking the most space. Do not fight it. Let it pass through awareness like weather. Pause. Beneath it, let a quieter truth appear. Feel your feet. Feel your hands. Feel the center of the chest. Let the body learn steadiness before the day asks anything from you. If something feels delayed or uncertain, do not judge it. Let it become information. Let it show you what matters. Let it show you what feels heavy. Let it show you what is asking for more honesty. Take one more breath. Notice the feeling underneath the day. Let it be present without letting it lead. Breathe as if your desired state is already allowed in the body. Nothing outside of you has to change in this moment for clarity to begin. For the final breaths, gather thought, feeling, and desire into one quiet center. Pause. Return with more space around what is true.",
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
        "Create one daily guided meditation tailored to the user's check-in.",
        "The meditation should feel spacious and unrushed, usually three to five minutes when read aloud slowly.",
        "Keep the script between 210 and 310 words.",
        "Use short sentences and quiet pauses.",
        "Add natural pause cues as standalone sentences, such as Pause. Stay here. Take one more breath.",
        "Place a pause cue every three to five sentences so the generated audio has real silence and does not rush.",
        "Prefer fewer words with more space over a dense script.",
        "Prioritize silence, breath, and embodiment over explanation.",
        "Do not pack the session with too many ideas.",
        "Use a grounded, premium, intimate, calm tone.",
        "The meditation should create clarity, spaciousness, and inner recognition. It should not feel like homework or a productivity exercise.",
        "Use the user's weakest pillar as the repair focus and strongest pillar as support.",
        "Use Will, Thinking, Feeling, Doing, and Being as subtle internal structure, but do not make the meditation sound like a lecture.",
        "In ClearPth, Will is the user's aim, Doing is the user's actions, and Being is the integrated state.",
        "If the user wants an outer result, guide them into the state, feeling, or identity beneath it without using the word manifestation.",
        "Avoid overemphasizing next steps, tasks, proof, or immediate action. A gentle clarity cue is enough.",
        "The closingPrompt should ask what feels clearer, what is now obvious, or what the user notices, not what task they will do.",
        "Do not make medical, therapeutic, diagnostic, or guaranteed claims.",
        "Use gender-neutral language by default.",
        "Do not use markdown formatting, bullets, numbering, headings, or labels inside JSON values.",
        "Return only valid JSON with keys: title, intention, durationSeconds, script, closingPrompt.",
        "durationSeconds must be between 210 and 300.",
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
