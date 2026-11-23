import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader } from "./load-module.mjs";

const load = createLoader();
const { buildResult } = load("lib/alignment.ts");
function checkIns(
  count,
  scores = { thinkingScore: 8, willingScore: 4, feelingScore: 7 },
) {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() - index);
    return {
      ...buildResult({
        ...scores,
        manifestationId: "focus",
        dominantThought: "",
        avoidedAction: "",
        currentFeeling: "",
        highestBeingChoice: "",
      }),
      id: `record-${index}`,
      createdAt: day.toISOString(),
    };
  });
}

function render(items, loaded = true) {
  let hookIndex = 0;
  const initial = [items, items[0] ?? null, loaded];
  const { BeingDashboard } = createLoader({
    react: {
      ...React,
      useState: (value) =>
        React.useState(
          hookIndex < initial.length ? initial[hookIndex++] : value,
        ),
    },
    "@/lib/use-manifestations": {
      useManifestations: () => ({ primary: { id: "focus" } }),
    },
    "@/components/manifestation-focus": {
      ManifestationFocus: () =>
        React.createElement("p", null, "Current desired reality"),
    },
    "@/components/manifestation-progress": {
      ManifestationProgress: () => {
        throw new Error("Goal progress should not render on Gap");
      },
    },
  })("components/being-dashboard.tsx");
  return renderToStaticMarkup(React.createElement(BeingDashboard));
}

test("Gap keeps cause, help, trend, history, and selected-day details without real-world progress or duplicate summaries", () => {
  const items = checkIns(5);
  const before = structuredClone(items);
  const markup = render(items);
  const sections = [
    "What&#x27;s creating the gap",
    "What can help close the gap",
    "Alignment Trend",
    "Check-In History",
    "Selected Day",
  ];
  for (const section of sections) assert.ok(markup.includes(section), section);
  for (let i = 1; i < sections.length; i++)
    assert.ok(markup.indexOf(sections[i - 1]) < markup.indexOf(sections[i]));
  assert.ok(markup.includes('href="/results?id=record-0"'));
  assert.ok(markup.includes("Previous month"));
  assert.ok(markup.includes("Next month"));
  assert.ok(markup.includes("Finish one visible action"));
  assert.ok(markup.includes("Thinking"));
  assert.ok(markup.includes("Acting"));
  assert.ok(markup.includes("Feeling"));
  for (const removed of [
    "What is becoming real?",
    "Outer Progress",
    "Pillars",
    "Your Gap Pattern",
    "Next Move",
    "Alignment Score",
  ])
    assert.ok(!markup.includes(removed), removed);
  assert.deepEqual(items, before);
});

test("a long alignment trend keeps every score while using fewer labels", () => {
  const markup = render(checkIns(60));
  assert.ok(markup.includes("60 recorded days"));
  assert.ok(markup.includes("Score line graph over time"));
  assert.equal((markup.match(/<circle /g) ?? []).length, 60);
  assert.ok((markup.match(/<text /g) ?? []).length <= 21);
  assert.ok(!markup.includes("NaN"));
});

test("strong and evenly rated histories do not automatically claim a deficit", () => {
  const strong = render(
    checkIns(4, { thinkingScore: 9, willingScore: 9, feelingScore: 10 }),
  );
  assert.ok(strong.includes("strong inner alignment"));
  assert.ok(strong.includes("Keep what is working."));
  const tied = render(
    checkIns(4, { thinkingScore: 4, willingScore: 4, feelingScore: 4 }),
  );
  assert.ok(tied.includes("No single area stands apart yet."));
  assert.ok(!tied.includes("lowest-rated area"));
});

test("Gap has distinct loading and empty states and retains the check-in entry point", () => {
  const loading = render([], false);
  assert.ok(loading.includes("Loading your patterns..."));
  assert.ok(!loading.includes("No pattern yet."));
  const empty = render([]);
  assert.ok(empty.includes("No pattern yet."));
  assert.ok(empty.includes('href="/check-in"'));
});
