type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function createJsonWithOpenAI<T>({
  system,
  user,
  fallback,
}: {
  system: string;
  user: unknown;
  fallback: T;
}): Promise<{ enabled: boolean; data: T }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { enabled: false, data: fallback };
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AURA_AI_MODEL || "gpt-5.4-mini",
      instructions: system,
      input: JSON.stringify(user),
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const result = (await response.json()) as ResponsesApiResult;
  const text = extractOutputText(result);
  const parsed = parseJson<T>(text);

  return { enabled: true, data: parsed ?? fallback };
}

export async function createTextWithOpenAI({
  system,
  user,
  fallback,
  maxOutputTokens = 900,
}: {
  system: string;
  user: unknown;
  fallback: string;
  maxOutputTokens?: number;
}): Promise<{ enabled: boolean; data: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { enabled: false, data: fallback };
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AURA_AI_MODEL || "gpt-5.4-mini",
      instructions: system,
      input: JSON.stringify(user),
      max_output_tokens: maxOutputTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const result = (await response.json()) as ResponsesApiResult;
  return { enabled: true, data: extractOutputText(result).trim() || fallback };
}

function extractOutputText(result: ResponsesApiResult) {
  if (result.output_text) return result.output_text;

  return (
    result.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function parseJson<T>(text: string) {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    return null;
  }
}

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}
