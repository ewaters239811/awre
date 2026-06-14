import { NextResponse } from "next/server";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { CheckInResult } from "@/lib/types";

type QuoteResult = {
  quote: string;
};

const fallback: QuoteResult = {
  quote:
    "Your outer magnetism strengthens when thought, action, and feeling stop arguing for separate futures.",
};

export async function POST(request: Request) {
  try {
    const result = (await request.json()) as CheckInResult | null;

    const ai = await createJsonWithOpenAI<QuoteResult>({
      fallback,
      system: [
        "Write one original AWRE teaching quote.",
        "The quote should be inspired by the user's latest alignment result when provided.",
        "Use an elegant, mystical, grounded tone. Avoid clinical or diagnostic language.",
        "Use gender-neutral language by default. Only use gendered language if the user explicitly provides gender context.",
        "Do not copy quotes from any author or external source.",
        "Return only valid JSON with one key: quote.",
        "Keep the quote under 28 words.",
      ].join(" "),
      user: result
        ? {
            beingScore: result.beingScore,
            stateLabel: result.stateLabel,
            strongestPillar: result.strongestPillar,
            weakestPillar: result.weakestPillar,
            dominantThought: result.dominantThought,
            avoidedAction: result.avoidedAction,
            currentFeeling: result.currentFeeling,
            highestBeingChoice: result.highestBeingChoice,
          }
        : {
            context:
              "No check-in is available yet. Generate a general AWRE quote.",
          },
    });

    return NextResponse.json(ai);
  } catch {
    return NextResponse.json(
      { enabled: false, data: fallback, error: "AI quote failed." },
      { status: 200 },
    );
  }
}
