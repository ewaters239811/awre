import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader } from "./load-module.mjs";

const load = createLoader();
const { buildHomeAlignmentContext, cleanHomeGap, fallbackHomeGap } = load(
  "lib/home-alignment.ts",
);
const { migrateManifestations, createManifestation, withManifestations } = load(
  "lib/manifestations.ts",
);
const { createEmptyOnboardingProfile } = load("lib/onboarding-storage.ts");
const { buildResult } = load("lib/alignment.ts");
const profile = migrateManifestations({
  ...createEmptyOnboardingProfile(),
  primaryGoal: "Do work I am proud of",
});
const goalId = profile.manifestations.primaryGoalId;
const result = {
  ...buildResult({
    thinkingScore: 8,
    willingScore: 4,
    feelingScore: 7,
    dominantThought: "I keep planning instead of showing my work",
    avoidedAction: "Share it",
    currentFeeling: "Nervous",
    highestBeingChoice: "Send a sample",
    manifestationId: goalId,
  }),
  id: "latest",
  createdAt: "2026-11-22T18:00:00Z",
};
const journal = {
  id: "journal",
  manifestationId: goalId,
  date: "2026-11-22",
  content: "I spent another day perfecting work I have not shown anyone.",
  createdAt: result.createdAt,
  updatedAt: result.createdAt,
};

test("home note uses goal-specific history and journals, not unrelated goals", () => {
  const other = createManifestation({
    outcome: "A loving relationship",
    category: "Relationships",
    identity: "",
    targetDate: "",
  });
  const both = withManifestations(profile, {
    ...profile.manifestations,
    goals: [...profile.manifestations.goals, other],
  });
  const older = {
    ...result,
    id: "older",
    createdAt: "2026-11-20T18:00:00Z",
    willingScore: 2,
  };
  const context = buildHomeAlignmentContext(
    [
      result,
      older,
      { ...result, manifestationId: other.id, dominantThought: "UNRELATED" },
    ],
    [journal, { ...journal, manifestationId: other.id, content: "UNRELATED" }],
    both,
  );
  assert.equal(context.checkInCount, 2);
  assert.equal(context.averages.acting, 3);
  assert.equal(context.journalCount, 1);
  assert.ok(context.journals[0].content.includes("perfecting"));
  assert.ok(!JSON.stringify(context).includes("UNRELATED"));
});

test("note signature changes for source reflections, not page reads or generated responses", () => {
  const signature = buildHomeAlignmentContext(
    [result],
    [journal],
    profile,
  ).signature;
  assert.ok(signature.startsWith("home-gap-v2-"));
  assert.equal(
    buildHomeAlignmentContext(
      [
        {
          ...result,
          readAt: "now",
          aiQuote: "A quote",
          aiHomeGap: { signature, statement: "Saved", generatedAt: "now" },
        },
      ],
      [{ ...journal, updatedAt: "new sync timestamp" }],
      profile,
    ).signature,
    signature,
  );
  assert.notEqual(
    buildHomeAlignmentContext(
      [result],
      [{ ...journal, content: "I shared the work today" }],
      profile,
    ).signature,
    signature,
  );
  assert.notEqual(
    buildHomeAlignmentContext(
      [result, { ...result, id: "new", createdAt: "2026-11-23T18:00:00Z" }],
      [journal],
      profile,
    ).signature,
    signature,
  );
});

test("fallback is honest when no history or strong alignment is present", () => {
  assert.match(
    fallbackHomeGap(buildHomeAlignmentContext([], [], profile)),
    /starting point/,
  );
  const strong = {
    ...result,
    thinkingScore: 9,
    willingScore: 9,
    feelingScore: 9,
  };
  assert.match(
    fallbackHomeGap(buildHomeAlignmentContext([strong], [journal], profile)),
    /strong inner alignment/,
  );
  assert.equal(
    cleanHomeGap(
      "**You keep preparing for a moment that your own words suggest you are ready to enter.** A second sentence.",
    ),
    "You keep preparing for a moment that your own words suggest you are ready to enter.",
  );
  assert.equal(cleanHomeGap("word ".repeat(100)), null);
  assert.equal(cleanHomeGap("word ".repeat(23) + "."), null);
  assert.equal(cleanHomeGap({ statement: "invalid" }), null);
  for (const scores of [[2, 8, 8], [8, 2, 8], [8, 8, 2], [5, 5, 5], [9, 9, 9]]) {
    const sample = { ...result, thinkingScore: scores[0], willingScore: scores[1], feelingScore: scores[2] };
    const fallback = fallbackHomeGap(buildHomeAlignmentContext([sample], [journal], profile));
    assert.equal(cleanHomeGap(fallback), fallback);
  }
});

test("home note endpoint requires sign-in before using the paid service", async () => {
  let called = false;
  const route = createLoader({
    "@/lib/server/account": { hasServerAccount: async () => false },
    "@/lib/server/openai": {
      createJsonWithOpenAI: async () => {
        called = true;
      },
    },
  })("app/api/alignment-note/route.ts");
  const response = await route.POST(
    new Request("http://localhost/api/alignment-note", {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("home note generation receives journal evidence and returns only the concise statement", async () => {
  let input;
  const route = createLoader({
    "@/lib/server/account": { hasServerAccount: async () => true },
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (args) => {
        input = args;
        return {
          enabled: true,
          data: {
            statement:
              "You keep perfecting what you have not shared, leaving your desired reality waiting for permission that only you can give.",
          },
        };
      },
    },
  })("app/api/alignment-note/route.ts");
  const context = buildHomeAlignmentContext([result], [journal], profile);
  const response = await route.POST(
    new Request("http://localhost/api/alignment-note", {
      method: "POST",
      body: JSON.stringify(context),
    }),
  );
  const payload = await response.json();
  assert.equal(payload.enabled, true);
  assert.equal(input.user.journals[0].content, journal.content);
  assert.ok(payload.statement.includes("shared"));
});

test("Home presents score, gap, check-in, and daily path in that order", () => {
  const note =
    "Your preparation is outpacing the steps that make your desired reality visible.";
  const homeModule = createLoader({
    "@/components/home-gap-note": {
      HomeGapNote: () => React.createElement("p", null, note),
    },
  })("components/home-hero.tsx");
  const markup = renderToStaticMarkup(
    React.createElement(homeModule.PersonalHomeHero, {
      state: {
        user: { user_metadata: { full_name: "Elijah" } },
        checkIns: [result],
        journalEntries: [journal],
        latestCheckIn: result,
        todaysCheckIn: null,
        todaysJournal: null,
        hasMeditatedToday: false,
        totalCheckIns: 1,
        totalJournals: 1,
        hasProfile: true,
        profile,
      },
    }),
  );
  assert.ok(markup.includes(`Inner alignment: ${result.beingScore.toFixed(1)} out of 10`));
  assert.ok(markup.indexOf("Inner alignment:") < markup.indexOf(note));
  assert.ok(markup.indexOf(note) < markup.indexOf('href="/check-in"'));
  assert.ok(markup.indexOf('href="/check-in"') < markup.indexOf("Daily Path"));
  assert.ok(!markup.includes("How It Works"));
});
