import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader, browserStorage } from "./load-module.mjs";

const load = createLoader();
const { getTodayReading } = load("lib/today-reading.ts");
const { TodayReading } = load("components/today-reading.tsx");
const { buildResult } = load("lib/alignment.ts");
const result = buildResult({
  thinkingScore: 8,
  willingScore: 4,
  feelingScore: 6,
  dominantThought: "",
  avoidedAction: "",
  currentFeeling: "",
  highestBeingChoice: "",
  checkInJournal:
    "I feel hopeful but keep waiting for certainty before sharing my work.",
});
const aiAlignment = {
  summary:
    "You know what matters to you, but the wish to feel certain is delaying the choice you want to make. There is room to act while feeling unsure.",
  dailyGap:
    "You know what matters, but you are waiting for certainty before letting your work be seen.",
  ...result.prescription,
};
const props = { loaded: true, status: "ready", onRetry() {}, onRead() {} };
const render = (extra) =>
  renderToStaticMarkup(
    React.createElement(TodayReading, { ...props, result, ...extra }),
  );

test("Today leads with one gap, one score, and the internal analysis without the old repeated sections", () => {
  const markup = render({ result: { ...result, aiAlignment } });
  assert.ok(markup.includes(aiAlignment.dailyGap));
  assert.ok(markup.includes(aiAlignment.summary));
  assert.ok(markup.includes("Alignment score: 6.0 out of 10"));
  assert.ok(
    markup.indexOf(aiAlignment.dailyGap) < markup.indexOf("Alignment score"),
  );
  assert.ok(
    markup.indexOf("Alignment score") <
      markup.indexOf("What&#x27;s happening inside"),
  );
  for (const removed of [
    "Who You Are Becoming",
    "Alignment Signal",
    "Today&#x27;s Journal",
    "How To Close The Gap",
    "Teaching",
  ])
    assert.ok(!markup.includes(removed));
  assert.ok(markup.includes("I&#x27;ve read this"));
});

test("personalized text waits for the service instead of flashing a generic reading", () => {
  const markup = render({ status: "loading" });
  assert.ok(markup.includes("Reading your check-in and journal"));
  assert.ok(markup.includes("Alignment score: 6.0 out of 10"));
  assert.ok(!markup.includes("as a focus today"));
  assert.ok(!markup.includes("Try Again"));
  assert.ok(!markup.includes("I&#x27;ve read this"));
});

test("older saved analysis is unchanged and high or tied scores do not invent a gap", () => {
  const legacy = {
    ...result,
    aiAlignment: { ...aiAlignment, dailyGap: undefined },
  };
  assert.equal(getTodayReading(legacy).summary, aiAlignment.summary);
  assert.match(getTodayReading(legacy).gap, /acting/);
  assert.match(
    getTodayReading({
      ...legacy,
      thinkingScore: 9,
      willingScore: 10,
      feelingScore: 9,
    }).gap,
    /strong inner alignment/,
  );
  assert.match(
    getTodayReading({
      ...legacy,
      thinkingScore: 4,
      willingScore: 4,
      feelingScore: 4,
    }).gap,
    /No single area/,
  );
  assert.equal(getTodayReading(result), null);
  assert.equal(legacy.aiAlignment.dailyGap, undefined);
});

test("unavailable readings offer retry without replacing a saved analysis with fallback advice", () => {
  const unavailable = render({ status: "unavailable" });
  assert.ok(unavailable.includes("Try Again"));
  assert.ok(unavailable.includes("still saved"));
  assert.ok(!unavailable.includes("Preparing today"));
  const cached = render({
    result: { ...result, aiAlignment },
    status: "unavailable",
  });
  assert.ok(cached.includes(aiAlignment.summary));
  assert.ok(cached.includes(aiAlignment.dailyGap));
});

test("Today has a clear empty state and preserves the existing header and Daily Path", () => {
  const empty = render({ result: null });
  assert.ok(empty.includes('href="/check-in"'));
  assert.ok(empty.includes("Your day starts here."));
  assert.ok(!empty.includes("Alignment score"));
  const page = createLoader({
    "@/lib/use-manifestations": {
      useManifestations: () => ({ primary: { id: "goal" } }),
    },
    "@/lib/use-current-check-in-date-key": {
      useCurrentCheckInDateKey: () => "2026-11-22",
    },
    "@/lib/use-current-date-key": { useCurrentDateKey: () => "2026-11-22" },
  })("app/review/page.tsx");
  const markup = renderToStaticMarkup(React.createElement(page.default));
  assert.ok(markup.includes("Today&#x27;s Review"));
  assert.ok(
    markup.includes(
      "See today&#x27;s gap, what is already aligned, and what needs one clean adjustment.",
    ),
  );
  assert.ok(markup.includes("Daily Path"));
  assert.ok(markup.indexOf("Daily Path") < markup.indexOf("The Gap Today"));
  assert.ok(!markup.includes("No check-in today"));
});

test("the existing personalization service requests a concise daily gap and internal analysis together", async () => {
  let instructions;
  const route = createLoader({
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (input) => {
        instructions = input.system;
        return { enabled: true, data: aiAlignment };
      },
    },
  })("app/api/personalize/route.ts");
  const response = await route.POST(
    new Request("http://localhost/api/personalize", {
      method: "POST",
      body: JSON.stringify({ result }),
    }),
  );
  const payload = await response.json();
  assert.equal(payload.data.dailyGap, aiAlignment.dailyGap);
  assert.match(instructions, /12 to 20 words/);
  assert.match(instructions, /50 to 80 words/);
  assert.match(instructions, /without inventing a problem/);
  assert.match(instructions, /journalForCheckIn/);
});

test("marking the new summary read completes the existing Daily Path once without changing its saved reading", async () => {
  const storage = browserStorage();
  let writes = 0;
  const local = createLoader({
    "@/lib/account-data": {
      saveCheckInToAccount: async () => {
        writes++;
      },
    },
  });
  try {
    const alignment = local("lib/alignment.ts");
    const saved = { ...result, aiAlignment };
    alignment.saveCheckIn(saved);
    const { buildCheckInReading } = local("lib/check-in-reading.ts");
    const signature = buildCheckInReading(saved, null, []).signature;
    const { markTodayRead } = local("lib/daily-path.ts");
    await markTodayRead();
    await markTodayRead();
    const next = alignment.getCheckInById(saved.id);
    assert.ok(next.readAt);
    assert.equal(writes, 1);
    assert.deepEqual(next.aiAlignment, aiAlignment);
    assert.equal(next.beingScore, result.beingScore);
    assert.equal(buildCheckInReading(next, null, []).signature, signature);
  } finally {
    storage.cleanup();
  }
});
