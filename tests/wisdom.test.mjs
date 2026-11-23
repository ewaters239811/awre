import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader } from "./load-module.mjs";

const load = createLoader();
const {
  WISDOM_PRINCIPLES,
  WISDOM_GUIDANCE,
  selectWisdomPrinciples,
  checkInWisdomTexts,
  wisdomBriefs,
  cleanDeeperPerspective,
  getCheckInPerspective,
} = load("lib/wisdom.ts");
const { buildResult } = load("lib/alignment.ts");
const { buildCheckInReading } = load("lib/check-in-reading.ts");
const result = buildResult({
  thinkingScore: 8,
  willingScore: 5,
  feelingScore: 7,
  dominantThought: "",
  avoidedAction: "",
  currentFeeling: "",
  highestBeingChoice: "",
  checkInJournal: "I keep waiting for approval before I share my work.",
  desiredReality: "Build fulfilling work",
});
const alignment = {
  dailyGap: "You are waiting for approval before allowing your work to be seen.",
  summary: "You care about your work and want to share it, but approval has become part of the condition for beginning. There is room to make a small contribution without asking it to settle your worth.",
  ...result.prescription,
};
const perspective = (id) => ({
  principleId: id,
  reflection: "You can care about feedback without making it permission to begin. A small contribution can be meaningful before you know how it will be received.",
  question: "What would you share if approval were not the condition for beginning?",
  practice: "Share one small piece of work with a person whose feedback you trust.",
});
const request = (body) => new Request("http://localhost/api/reflection", {
  method: "POST",
  body: JSON.stringify(body),
});

test("the small wisdom library has sixteen original, source-attributed briefs across four themes", () => {
  assert.equal(WISDOM_PRINCIPLES.length, 16);
  assert.equal(new Set(WISDOM_PRINCIPLES.map((item) => item.id)).size, 16);
  assert.deepEqual([...new Set(WISDOM_PRINCIPLES.map((item) => item.theme))].sort(), ["Desire", "Detachment", "Identity", "Stillness"]);
  for (const item of WISDOM_PRINCIPLES) {
    assert.ok(item.title && item.principle && item.question && item.practice);
    assert.ok(item.source.author && item.source.title && item.source.context && item.location);
    assert.equal(new URL(item.source.url).protocol, "https:");
    assert.ok(item.signals.length > 0);
    assert.ok(item.principle.split(/\s+/).length <= 45);
  }
  assert.match(WISDOM_GUIDANCE, /not quotations/);
  assert.match(WISDOM_GUIDANCE, /not evidence of a hidden motive/);
  assert.match(WISDOM_GUIDANCE, /practical constraints/);
  assert.match(WISDOM_GUIDANCE, /Do not spiritualize crisis/);
  assert.match(WISDOM_GUIDANCE, /no outbound URLs/);
  assert.match(WISDOM_GUIDANCE, /does not restrict recommending trusted people/);
});

test("selection is deterministic, bounded, and based on writing rather than low scores or repeated keywords", () => {
  const writing = checkInWisdomTexts(result);
  const selected = selectWisdomPrinciples(writing);
  assert.equal(selected[0].id, "identity-without-audience");
  assert.ok(selected.length <= 2);
  assert.deepEqual(selectWisdomPrinciples([...writing, ...writing]), selected);
  assert.deepEqual(selectWisdomPrinciples(writing), selected);
  assert.equal(selectWisdomPrinciples(writing, 100).length, selected.length);
  assert.equal(selectWisdomPrinciples(writing, 0).length, 0);
  assert.equal(selectWisdomPrinciples(writing, 1).length, 1);
  assert.deepEqual(selectWisdomPrinciples([null, 3, {}, "I watered the plants and ate lunch."]), []);
  const noWriting = { ...result, checkInJournal: "", thinkingScore: 1, feelingScore: 1, willingScore: 1 };
  assert.deepEqual(selectWisdomPrinciples(checkInWisdomTexts(noWriting)), []);
  assert.equal(getCheckInPerspective(noWriting), null);
  assert.deepEqual(selectWisdomPrinciples(["the scarlet carpet"]), []);
  assert.ok(wisdomBriefs(selected).every((brief) => !Object.hasOwn(brief, "signals")));
  assert.ok(wisdomBriefs(selected).every((brief) => !Object.hasOwn(brief.source, "url")));
  assert.ok(!JSON.stringify(wisdomBriefs(selected)).includes("https://"));
});

test("crisis and abuse language never trigger a spiritual exercise, including for saved perspectives", () => {
  for (const writing of [
    "I feel anxious and want to die.",
    "I can’t go on and need control.",
    "I have severe depression and want to meditate.",
    "My partner is abusive and I am scared of rejection.",
    "There is stalking and I need clarity.",
  ]) {
    assert.deepEqual(selectWisdomPrinciples([writing]), []);
    assert.equal(getCheckInPerspective({
      ...result,
      checkInJournal: writing,
      aiAlignment: { ...alignment, deeperPerspective: perspective("identity-without-audience") },
    }), null);
  }
});

test("new personalized perspectives accept only selected principle ids and short plain text", () => {
  const selected = selectWisdomPrinciples(checkInWisdomTexts(result));
  const valid = perspective(selected[0].id);
  assert.deepEqual(cleanDeeperPerspective(valid, selected), valid);
  assert.equal(cleanDeeperPerspective({ ...valid, principleId: "invented-source" }, selected), undefined);
  assert.equal(cleanDeeperPerspective({ ...valid, principleId: "stillness-not-a-test" }, selected), undefined);
  assert.equal(cleanDeeperPerspective({ ...valid, reflection: "word ".repeat(61) }, selected), undefined);
  assert.equal(cleanDeeperPerspective({ ...valid, question: "<script>invented()</script>" }, selected), undefined);
  assert.equal(cleanDeeperPerspective({ ...valid, practice: "Visit https://example.com for the truth." }, selected), undefined);
  assert.equal(cleanDeeperPerspective(null, selected), undefined);
  assert.equal(cleanDeeperPerspective({ ...valid, question: {} }, selected), undefined);
});

test("older readings gain an optional original practice without rewriting, resaving, or invalidating their analysis", () => {
  const saved = { ...result, aiAlignment: alignment };
  const before = structuredClone(saved);
  const signature = buildCheckInReading(saved, null, []).signature;
  const reading = getCheckInPerspective(saved);
  assert.equal(reading.principle.id, "identity-without-audience");
  assert.equal(reading.perspective.reflection, reading.principle.principle);
  assert.deepEqual(saved, before);
  assert.equal(buildCheckInReading(saved, null, []).signature, signature);
  const personalized = { ...saved, aiAlignment: { ...alignment, deeperPerspective: perspective(reading.principle.id) } };
  assert.deepEqual(getCheckInPerspective(personalized).perspective, personalized.aiAlignment.deeperPerspective);
  assert.equal(buildCheckInReading(personalized, null, []).signature, signature);
  assert.equal(getCheckInPerspective({ ...saved, aiAlignment: { ...alignment, deeperPerspective: null } }), null);
  assert.equal(getCheckInPerspective({ ...saved, aiAlignment: { ...alignment, deeperPerspective: perspective("invented") } }), null);
});

test("Today keeps deeper guidance closed by default without source credits or outbound links", () => {
  const { TodayReading } = load("components/today-reading.tsx");
  const props = { loaded: true, status: "ready", onRetry() {}, onRead() {} };
  const markup = renderToStaticMarkup(React.createElement(TodayReading, { ...props, result: { ...result, aiAlignment: alignment } }));
  const details = markup.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(details);
  assert.ok(!/\bopen\b/.test(details[1]));
  assert.ok(details[2].includes("Go deeper"));
  assert.ok(details[2].includes("A small practice"));
  assert.ok(!details[2].includes("<footer"));
  assert.ok(!details[2].includes("<a "));
  assert.ok(!details[2].includes("href="));
  assert.ok(!details[2].includes("not a quotation"));
  assert.ok(!details[2].includes("Teresa of Avila"));
  assert.ok(!details[2].includes("Christian mysticism"));
  assert.ok(markup.includes(alignment.summary));
  const loading = renderToStaticMarkup(React.createElement(TodayReading, { ...props, result, status: "loading" }));
  assert.ok(!loading.includes("Go deeper"));
});

test("personalization supplies selected briefs and validates the deeper response without changing its summary", async () => {
  let input;
  const route = createLoader({
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (args) => {
        input = args;
        return { enabled: true, data: { ...alignment, deeperPerspective: perspective(args.user.wisdomBriefs[0].id) } };
      },
    },
  })("app/api/personalize/route.ts");
  const response = await route.POST(request({ result }));
  const payload = await response.json();
  assert.equal(payload.data.summary, alignment.summary);
  assert.equal(payload.data.deeperPerspective.principleId, "identity-without-audience");
  assert.ok(input.user.wisdomBriefs.length <= 2);
  assert.match(input.system, /Material needs and practical changes are legitimate/);
  assert.match(input.system, /return null when no wisdomBrief fits/);
});

test("personalization rejects an unselected source and honors an explicit decision not to add a perspective", async () => {
  for (const deeper of [null, perspective("not-a-real-principle"), perspective("stillness-not-a-test")]) {
    const route = createLoader({
      "@/lib/server/openai": { createJsonWithOpenAI: async () => ({ enabled: true, data: { ...alignment, deeperPerspective: deeper } }) },
    })("app/api/personalize/route.ts");
    const response = await route.POST(request({ result }));
    const payload = await response.json();
    assert.equal(payload.data.deeperPerspective, null);
    assert.equal(payload.data.summary, alignment.summary);
    assert.equal(getCheckInPerspective({ ...result, aiAlignment: payload.data }), null);
  }
});

test("Talk draws wisdom only from the conversation, never from the person's journal or saved goal", async () => {
  let input;
  const route = createLoader({
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (args) => {
        input = args;
        return { enabled: true, data: { reply: "What would sharing your work mean to you?", suggestions: ["Explore that.", "Help me begin.", "What am I expecting?"] } };
      },
    },
  })("app/api/guide/route.ts");
  await route.POST(request({
    messages: [{ role: "user", content: "I keep waiting for approval before I share my work." }],
    conversationMemory: "I want to contribute something meaningful.",
    onboardingProfile: { primaryGoal: "PRIVATE GOAL", currentChallenge: "PRIVATE CHALLENGE" },
    journalEntries: [{ content: "PRIVATE JOURNAL" }],
  }));
  assert.equal(input.user.wisdomBriefs[0].id, "identity-without-audience");
  assert.ok(!JSON.stringify(input.user).includes("PRIVATE"));
  assert.match(input.system, /not emotional dependence/);
  assert.match(input.system, /Do not force a root cause/);
  assert.ok(!input.system.includes("feel addictive"));
});

test("Talk greeting and crisis paths still bypass the paid service and wisdom selection", async () => {
  let calls = 0;
  const route = createLoader({
    "@/lib/server/openai": { createJsonWithOpenAI: async () => { calls++; throw new Error("Should not run"); } },
  })("app/api/guide/route.ts");
  const greeting = await (await route.POST(request({ messages: [{ role: "user", content: "Hi" }] }))).json();
  assert.ok(greeting.data.startsWith("Hi."));
  const crisis = await (await route.POST(request({ messages: [{ role: "user", content: "I want to kill myself" }] }))).json();
  assert.ok(crisis.data.includes("emergency services"));
  assert.equal(calls, 0);
});

test("Tune In uses one relevant practice without changing audio pacing, script limits, or saved-session signatures", async () => {
  let input;
  const route = createLoader({
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (args) => { input = args; return { enabled: true, data: args.fallback }; },
    },
  })("app/api/meditation/route.ts");
  await route.POST(request({ result }));
  assert.equal(input.user.wisdomBriefs.length, 1);
  assert.equal(input.user.wisdomBriefs[0].id, "identity-without-audience");
  assert.match(input.system, /180 and 320 words/);
  assert.match(input.system, /pause cue after every two to four/);
  assert.match(input.system, /Preserve generous silence/);
  assert.match(input.system, /Eyes may be open or closed/);
  assert.match(input.system, /does not prove a deficit/);
});
