import { NextResponse } from "next/server";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type {
  BeingDashboardAnalysis,
  CheckInResult,
  DailyRitual,
} from "@/lib/types";

type AnalysisRequest = {
  checkIns?: CheckInResult[];
  rituals?: DailyRitual[];
  metrics?: unknown;
};

const fallback: BeingDashboardAnalysis = {
  archetype: "Active Integration",
  summary:
    "Your Being is being shaped by the relationship between your scores, your rituals, and your willingness to return to alignment.",
  rootCause:
    "The likely root cause is the place where thought, action, and feeling are not yet reinforcing the same identity.",
  hiddenDebt:
    "The hidden debt is the area where your inner knowing is not yet becoming daily action.",
  leveragePoint:
    "Use the weakest pillar as the doorway. Make one correction there before seeking more complexity.",
  nextPractice:
    "Choose one thought to hold, one action to complete, and one feeling to embody in the next 24 hours.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalysisRequest;

    const response = await createJsonWithOpenAI<BeingDashboardAnalysis>({
      fallback,
      system: [
        "You write for AWRE, a self-reflection and personal growth app.",
        "Create a depth analysis of the user's Being using their check-ins, rituals, and computed metrics.",
        "You are grounded in anthroposophy, esotericism, Christian mysticism, theosophy, Rosicrucianism, and neuroscience, but you must avoid inflated claims.",
        "This is not therapy, diagnosis, medical advice, or crisis support.",
        "Use gender-neutral language by default: say person, self, life, presence, or identity rather than man, woman, masculine, feminine, he, she, his, or her.",
        "Only use gendered language if the user explicitly states their gender or asks you to reflect it.",
        "Use the phrase integration debt to mean the gap between the user's strongest and weakest pillars.",
        "Include a rootCause field that explains the likely root cause of a low or unstable Being score using the user's pillar scores, reflections, rituals, and patterns.",
        "Do not diagnose. Frame root cause as a reflective pattern, not a medical cause.",
        "Return only valid JSON with keys: archetype, summary, rootCause, hiddenDebt, leveragePoint, nextPractice.",
        "Keep each value concise and premium. Make it feel insightful, direct, and personally sculpted.",
      ].join(" "),
      user: {
        metrics: body.metrics,
        recentCheckIns: (body.checkIns ?? []).slice(0, 12).map((item) => ({
          createdAt: item.createdAt,
          thinkingScore: item.thinkingScore,
          willingScore: item.willingScore,
          feelingScore: item.feelingScore,
          beingScore: item.beingScore,
          stateLabel: item.stateLabel,
          strongestPillar: item.strongestPillar,
          weakestPillar: item.weakestPillar,
          dominantThought: item.dominantThought,
          avoidedAction: item.avoidedAction,
          currentFeeling: item.currentFeeling,
          highestBeingChoice: item.highestBeingChoice,
        })),
        recentRituals: (body.rituals ?? []).slice(0, 12).map((ritual) => ({
          date: ritual.date,
          chosenBeing: ritual.chosenBeing,
          morningIntention: ritual.morningIntention,
          protectedBoundary: ritual.protectedBoundary,
          eveningAlignment: ritual.eveningAlignment,
          eveningFragmentation: ritual.eveningFragmentation,
          lesson: ritual.lesson,
        })),
      },
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { enabled: false, data: fallback, error: "Being analysis failed." },
      { status: 200 },
    );
  }
}
