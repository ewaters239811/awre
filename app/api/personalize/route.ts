import { NextResponse } from "next/server";
import { buildPersonalizationLens } from "@/lib/personalization-lens";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type {
  AiAlignment,
  CheckInResult,
  OnboardingProfile,
} from "@/lib/types";
import { profileForCheckIn } from "@/lib/manifestations";

type PersonalizeRequest =
  | CheckInResult
  | {
      result?: CheckInResult;
      onboardingProfile?: OnboardingProfile | null;
      journalForCheckIn?: { date: string; content: string } | null;
      recentJournalEntries?: Array<{
        date: string;
        content: string;
      }>;
    };

const fallback: AiAlignment = {
  summary:
    "Your result shows where today's state is closest to your desired reality and where the gap still needs attention.",
  thoughtCorrection:
    "Choose the cleanest interpretation of your situation and return to it when the mind scatters.",
  actionStep:
    "Take one visible step that makes your highest choice real before the day gets noisy.",
  embodimentPractice:
    "Breathe slowly, relax the jaw and shoulders, and let the body rehearse steadiness.",
  identityAffirmation: "I am becoming the person who can hold the life I want.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PersonalizeRequest;
    const result = getPersonalizeResult(body);
    const recentJournalEntries =
      "recentJournalEntries" in body ? (body.recentJournalEntries ?? []) : [];
    const journalForCheckIn =
      "journalForCheckIn" in body ? (body.journalForCheckIn ?? null) : null;
    const onboardingProfile = profileForCheckIn(
      "onboardingProfile" in body ? (body.onboardingProfile ?? null) : null,
      result ?? {},
    );
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
        "Create a personalized alignment result by reading the Thinking, Feeling, and Acting scores together with the checkInJournal submitted with them. Treat that journal as the user's own account of today, not as a separate assignment or a minor supplement to the ratings.",
        "When journalForCheckIn is supplied, it is the saved writing linked to this check-in and may contain later reflections. Include those additions in the analysis alongside the original submitted snapshot and the ratings. Treat duplicated writing across these sources as one account, not repeated evidence of a pattern.",
        "The selected desiredReality is the specific goal this check-in belongs to. Explain how the journal gives meaning to the ratings, acknowledge strengths, and suggest one practical choice supported by what the user actually wrote. The lowest score can guide attention, but cannot establish a root cause on its own. If scores and writing differ, acknowledge the nuance rather than forcing a match. High or equal scores do not require an invented gap.",
        "Older check-ins may use dominantThought, avoidedAction, currentFeeling, and highestBeingChoice instead of checkInJournal. Empty legacy fields are missing information, not evidence of avoidance or emotional difficulty. Saved journals may include the submitted writing again; this is the same evidence, not a repeated pattern.",
        "Thinking, Feeling, and Acting are self-reported reflection dimensions; Acting includes choices and actions. Inner alignment does not scientifically measure or guarantee outer results. Support realistic action and recognize circumstances outside the user's control.",
        "Use ClearPth's refined model: Will is the user's stated aim or desired reality, Thinking is what they think, Feeling is what they feel, Acting is what they actually do, and Being is the integrated state.",
        "The daily action score may be named willingScore or Doing in older data for compatibility, but always refer to this pillar as Acting.",
        "Use a premium, grounded, mystical, clean tone without sounding clinical.",
        "Where the user's words support it, offer a possible underlying pattern or need. Do not present inferred motives, shadow patterns, or root causes as established facts. Do not assume something is wrong.",
        "If recent journal entries are provided, use them as private context for repeated patterns, emotional charges, avoided actions, and root issue clues.",
        "If an onboarding profile is provided, use it to calibrate the user's goal, preferred tone, commitment level, desired state, and comfort with mystical language.",
        "If a private personalization lens is provided, use it only to subtly tune rhythm, growth edge, and practice style. Never mention numbers, calculations, birthdays, numerology, or that a hidden lens is being used.",
        "Do not quote journal entries at length. Distill them into the current check-in reading.",
        "Use Jungian psychology lightly as a lens for integration, shadow, persona, projection, and self-recognition without sounding academic.",
        "Frame manifestation as becoming emotionally independent from outer confirmation: the user practices the state they seek before reality visibly changes.",
        "If the user's desire is external, translate it into the inner feeling or identity it represents, then give a practical action from that state.",
        "Use plain language first: current state, desired reality, gap, aligned action, and the person they are becoming.",
        "Do not make the result sound like mood tracking. Make it feel like an alignment reading for becoming the person who can live the desired reality.",
        "Do not imply blame for difficult circumstances. Keep the focus on agency, emotional charge, and the next honest inner correction.",
        "Use gender-neutral language by default: say person, self, life, presence, or identity rather than man, woman, masculine, feminine, he, she, his, or her.",
        "Only use gendered language if the user explicitly states their gender or asks you to reflect it.",
        "Do not use markdown formatting, bold text, headings, bullets, or numbered lists inside JSON values.",
        "Do not mention diagnoses, treatment, symptoms, disorders, or guarantees.",
        "Return only valid JSON with keys: dailyGap, summary, thoughtCorrection, actionStep, embodimentPractice, identityAffirmation.",
        "dailyGap is one clear sentence of 12 to 20 words, never more than 22 words. Name the most meaningful tension supported by today's journal and ratings, not merely the lowest-scoring pillar. If no gap is evident, acknowledge what is aligned without inventing a problem. This is today's picture, not a claim about the user's whole life or the cause of external circumstances.",
        "summary explains what may be happening internally in one natural paragraph of 50 to 80 words, at most three sentences. Connect the user's thoughts, feelings, and actions with their own writing. Offer a useful insight rather than repeating the ratings, retelling their journal, or repeating dailyGap. Do not start with meta-commentary such as Your check-in shows or In ClearPth terms.",
        "Keep thoughtCorrection, actionStep, embodimentPractice, and identityAffirmation to one concise sentence each.",
      ].join(" "),
      user: {
        thinkingScore: result.thinkingScore,
        actingScore: result.willingScore,
        feelingScore: result.feelingScore,
        beingScore: result.beingScore,
        stateLabel: result.stateLabel,
        strongestPillar: result.strongestPillar,
        weakestPillar: result.weakestPillar,
        checkInJournal: result.checkInJournal,
        journalForCheckIn,
        dominantThought: result.dominantThought,
        avoidedAction: result.avoidedAction,
        currentFeeling: result.currentFeeling,
        highestBeingChoice: result.highestBeingChoice,
        desiredReality: result.desiredReality ?? onboardingProfile?.primaryGoal,
        innerFoundation:
          result.innerFoundation ??
          onboardingProfile?.manifestations?.innerFoundation,
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
