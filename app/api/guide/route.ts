import { NextResponse } from "next/server";
import { createTextWithOpenAI } from "@/lib/server/openai";
import type { CheckInResult } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GuideRequest = {
  messages?: ChatMessage[];
  latestCheckIn?: CheckInResult | null;
};

const crisisPattern =
  /\b(suicide|self[-\s]?harm|kill myself|end my life|can't go on|severe depression|crisis)\b/i;

const supportMessage =
  "I am here as a reflection guide, not crisis support. If you may hurt yourself or feel in immediate danger, call emergency services now, contact a trusted person, or in the U.S. call or text 988 for the Suicide & Crisis Lifeline.";

const fallback =
  "Bring the challenge into one clean sentence. Then name the thought driving it, the action being avoided, and the feeling charging it. From there, choose one honorable step you can take today.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GuideRequest;
    const messages = body.messages ?? [];
    const latestUserMessage =
      [...messages].reverse().find((message) => message.role === "user")
        ?.content ?? "";

    if (crisisPattern.test(latestUserMessage)) {
      return NextResponse.json({ enabled: true, data: supportMessage });
    }

    const response = await createTextWithOpenAI({
      fallback,
      maxOutputTokens: 900,
      system: [
        "You are AWRE's daily reflection guide.",
        "You are fluent in anthroposophy, esotericism, Christian mysticism, theosophy, Rosicrucianism, and neuroscience.",
        "Use those traditions as lenses, but do not posture, overclaim, or cite invented authorities.",
        "Keep the tone premium, grounded, clear, and spiritually serious.",
        "Use gender-neutral language by default: say person, self, life, presence, or identity rather than man, woman, masculine, feminine, he, she, his, or her.",
        "Only use gendered language if the user explicitly states their gender or asks you to reflect it.",
        "Help the user work with daily challenges through the AWRE model: Thinking, Willing, Feeling, and Being.",
        "Give practical reflection, one next action, and one embodiment practice when useful.",
        "Do not provide medical, therapeutic, diagnostic, legal, or financial advice.",
        "If the user indicates self-harm, severe depression, or immediate danger, respond only with a gentle crisis support message.",
        "Avoid saying you are an AI unless directly asked.",
        "Keep responses concise: 2 to 5 short paragraphs.",
      ].join(" "),
      user: {
        latestCheckIn: body.latestCheckIn
          ? {
              thinkingScore: body.latestCheckIn.thinkingScore,
              willingScore: body.latestCheckIn.willingScore,
              feelingScore: body.latestCheckIn.feelingScore,
              beingScore: body.latestCheckIn.beingScore,
              stateLabel: body.latestCheckIn.stateLabel,
              strongestPillar: body.latestCheckIn.strongestPillar,
              weakestPillar: body.latestCheckIn.weakestPillar,
              dominantThought: body.latestCheckIn.dominantThought,
              avoidedAction: body.latestCheckIn.avoidedAction,
              currentFeeling: body.latestCheckIn.currentFeeling,
              highestBeingChoice: body.latestCheckIn.highestBeingChoice,
            }
          : null,
        conversation: messages.slice(-10),
      },
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ enabled: false, data: fallback }, { status: 200 });
  }
}
