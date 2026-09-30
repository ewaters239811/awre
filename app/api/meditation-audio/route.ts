import { NextResponse } from "next/server";

type MeditationAudioRequest = {
  text?: string;
};

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
    const modelId = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
    const outputFormat =
      process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
    const speed = parseVoiceSpeed(process.env.ELEVENLABS_VOICE_SPEED);

    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs is not configured." },
        { status: 501 },
      );
    }

    const body = (await request.json()) as MeditationAudioRequest;
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Missing meditation text." },
        { status: 400 },
      );
    }

    const audioText = prepareMeditationAudioText(text);

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/${voiceId}?output_format=${outputFormat}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: audioText,
          model_id: modelId,
          voice_settings: {
            stability: 0.84,
            similarity_boost: 0.78,
            speed,
            style: 0.08,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "ElevenLabs audio generation failed." },
        { status: response.status },
      );
    }

    const audio = await response.arrayBuffer();

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Meditation audio failed." },
      { status: 500 },
    );
  }
}

function parseVoiceSpeed(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.7;
  return Math.min(Math.max(parsed, 0.7), 1.2);
}

function prepareMeditationAudioText(text: string) {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\bPause\./gi, "Pause...")
    .replace(/\bStay here\./gi, "Stay here...")
    .replace(/\bTake one more breath\./gi, "Take one more breath...")
    .trim();

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      const trimmed = sentence.trim();
      const isPauseCue =
        /^(pause|stay here|take one more breath|breathe|rest)\b/i.test(
          trimmed,
        );
      const needsLongRest =
        isPauseCue ||
        /\b(breathe|breath|body|feel|settle|still|quiet|space|soften|shoulders|jaw|feet|hands|chest)\b/i.test(
          trimmed,
        );

      if (trimmed.endsWith("...")) {
        return needsLongRest ? `${trimmed} ...` : trimmed;
      }

      return needsLongRest ? addRest(trimmed) : trimmed;
    })
    .join("\n\n");
}

function addRest(sentence: string) {
  return sentence.replace(/[.!?]+$/, "") + "...";
}
