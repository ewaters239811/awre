import { NextResponse } from "next/server";
import { createJsonWithOpenAI } from "@/lib/server/openai";
import type { CheckInResult } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GuideRequest = {
  messages?: ChatMessage[];
  latestCheckIn?: CheckInResult | null;
};

type GuideResponse = {
  reply: string;
  suggestions: string[];
};

const crisisPattern =
  /\b(suicide|self[-\s]?harm|kill myself|end my life|can't go on|severe depression|crisis)\b/i;

const supportMessage =
  "I am here as a reflection guide, not crisis support. If you may hurt yourself or feel in immediate danger, call emergency services now, contact a trusted person, or in the U.S. call or text 988 for the Suicide & Crisis Lifeline.";

const fallback =
  "Bring the challenge into one clean sentence. Then name the thought driving it, the action being avoided, and the feeling charging it. From there, choose one honorable step you can take today.";

const fallbackSuggestions = [
  "What is the deeper root of this pattern?",
  "What feeling am I trying to get from the outside?",
  "What is one practical action I can take from that state?",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GuideRequest;
    const messages = body.messages ?? [];
    const latestUserMessage =
      [...messages].reverse().find((message) => message.role === "user")
        ?.content ?? "";

    if (crisisPattern.test(latestUserMessage)) {
      return NextResponse.json({
        enabled: true,
        data: supportMessage,
        suggestions: [
          "Who is one trusted person I can contact now?",
          "What immediate step would make me safer?",
          "Help me make the next minute simple.",
        ],
      });
    }

    const response = await createJsonWithOpenAI<GuideResponse>({
      fallback: {
        reply: fallback,
        suggestions: fallbackSuggestions,
      },
      maxOutputTokens: 900,
      system: [
        "You are ClearPth's daily reflection guide.",
        "You are fluent in anthroposophy, esotericism, Christian mysticism, theosophy, Rosicrucianism, and neuroscience.",
        "Use those traditions as lenses, but do not posture, overclaim, or cite invented authorities.",
        "Keep the tone premium, grounded, clear, and spiritually serious.",
        "Use gender-neutral language by default: say person, self, life, presence, or identity rather than man, woman, masculine, feminine, he, she, his, or her.",
        "Only use gendered language if the user explicitly states their gender or asks you to reflect it.",
        "Help the user work with daily challenges through the ClearPth model: Thinking, Willing, Feeling, and Being.",
        "When the user names an external desire, problem, or goal, look beneath it for the inner state, unmet feeling, identity shift, projection, or shadow pattern that may be driving it.",
        "Use Jungian psychology as a practical lens for shadow, projection, persona, archetypal patterns, and integration, but do not use heavy jargon unless it helps the user see themselves clearly.",
        "Treat manifestation as inner alignment and emotional independence: guide the user toward embodying the feeling or identity they are seeking before needing outer reality to confirm it.",
        "Do not imply that outer circumstances are irrelevant or that people are to blame for hardship; keep the focus on the user's agency, interpretation, emotional charge, and next embodied choice.",
        "If a user wants something physical, ask what state it represents, how it would make them feel, and how they can practice that state now while still taking practical action.",
        "Give practical reflection, one next action, and one embodiment practice when useful.",
        "Write in smooth natural paragraphs by default, not a worksheet or scripted coaching format.",
        "Do not use markdown bold, markdown headings, numbered lists, or labels like Thinking, Feeling, One next action, or Embodiment practice unless the user explicitly asks for a structured breakdown.",
        "Blend the practical action and embodiment practice into the prose so the response feels human and conversational.",
        "Return only valid JSON with keys: reply, suggestions.",
        "The reply value is the guide response. The suggestions value is exactly three short contextual follow-up prompts based on your reply and the user's situation.",
        "Each suggestion should feel specific to the exchange, invite deeper self-understanding or practical movement, and be written as something the user could send next.",
        "Do not repeat the same generic suggestions every time.",
        "Do not use markdown formatting inside reply or suggestions.",
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

    return NextResponse.json({
      enabled: response.enabled,
      data: response.data.reply,
      suggestions:
        response.data.suggestions?.slice(0, 3) ?? fallbackSuggestions,
    });
  } catch {
    return NextResponse.json(
      { enabled: false, data: fallback, suggestions: fallbackSuggestions },
      { status: 200 },
    );
  }
}
