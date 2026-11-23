import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader } from "./load-module.mjs";

const load = createLoader();
const {
  getHomeNextAction,
  buildHomeScoreInsight,
  buildHomeAlignmentContext,
  cleanHomeGapEvidence,
} = load("lib/home-alignment.ts");
const { createEmptyOnboardingProfile } = load("lib/onboarding-storage.ts");
const { migrateManifestations, createManifestation, withManifestations } = load("lib/manifestations.ts");
const { buildResult } = load("lib/alignment.ts");
const profile = migrateManifestations({
  ...createEmptyOnboardingProfile(),
  primaryGoal: "Share work I am proud of",
});
const goalId = profile.manifestations.primaryGoalId;
const sample = buildResult({
  manifestationId: goalId,
  thinkingScore: 7,
  feelingScore: 7,
  willingScore: 7,
  dominantThought: "",
  avoidedAction: "",
  currentFeeling: "",
  highestBeingChoice: "",
  checkInJournal: "I keep waiting to feel certain before I share my work.",
});
const checkIn = (date, score = 7, overrides = {}) => ({
  ...sample,
  id: `check-${date}`,
  createdAt: `${date}T12:00:00`,
  thinkingScore: score,
  willingScore: score,
  feelingScore: score,
  beingScore: score,
  ...overrides,
});
const history = [
  ...["2026-11-23", "2026-11-21", "2026-11-17"].map((date) => checkIn(date, 8)),
  ...["2026-11-16", "2026-11-13", "2026-11-10"].map((date) => checkIn(date, 6)),
];

test("Home always leads to the first unfinished daily step, even when steps are completed out of order", () => {
  for (const checkedIn of [false, true]) {
    for (const readToday of [false, true]) {
      for (const meditated of [false, true]) {
        const state = { checkedIn, readToday, meditated };
        assert.equal(getHomeNextAction({ ...state, hasFocus: false }).href, "/manifestations");
        const next = getHomeNextAction({ ...state, hasFocus: true });
        if (!checkedIn) assert.equal(next.href, "/check-in");
        else if (!readToday) assert.equal(next.href, "/review");
        else if (!meditated) assert.equal(next.href, "/tune-in");
        else {
          assert.equal(next.label, "Your day is complete");
          assert.equal(next.href, undefined);
        }
      }
    }
  }
});

test("score context compares actual goal-specific averages, not a claim about consistency or external success", () => {
  const before = structuredClone(history);
  const insight = buildHomeScoreInsight(history, profile, "2026-11-23");
  assert.equal(insight.text, "Your average is 2.0 higher than last week.");
  assert.equal(insight.currentCount, 3);
  assert.equal(insight.previousCount, 3);
  assert.equal(insight.currentAverage, 8);
  assert.equal(insight.previousAverage, 6);
  assert.deepEqual(history, before);
  const lower = history.map((item) => ({
    ...item,
    thinkingScore: 10 - item.thinkingScore,
    feelingScore: 10 - item.feelingScore,
    willingScore: 10 - item.willingScore,
  }));
  assert.equal(buildHomeScoreInsight(lower, profile, "2026-11-23").text, "Your average is 2.0 lower than last week.");
  const equal = history.map((item) => ({ ...item, thinkingScore: 7, willingScore: 7, feelingScore: 7 }));
  assert.equal(buildHomeScoreInsight(equal, profile, "2026-11-23").text, "Your average is similar to last week.");
});

test("a comparison needs three distinct days in each week and ignores other goals, future entries and invalid ratings", () => {
  assert.equal(buildHomeScoreInsight(history.slice(1), profile, "2026-11-23"), null);
  assert.equal(buildHomeScoreInsight([], profile, "2026-11-23"), null);
  assert.equal(buildHomeScoreInsight(history, null, "2026-11-23"), null);
  assert.equal(buildHomeScoreInsight(history, profile, "invalid"), null);
  const other = createManifestation({ outcome: "A caring relationship", category: "Relationships", identity: "", targetDate: "" });
  const both = withManifestations(profile, {
    ...profile.manifestations,
    goals: [...profile.manifestations.goals, other],
  });
  const polluted = [
    ...history,
    checkIn("2026-11-22", 1, { manifestationId: other.id }),
    checkIn("2026-11-24", 1),
    checkIn("2026-11-09", 1),
    checkIn("2026-11-18", 12),
    checkIn("2026-11-19", NaN),
    checkIn("2026-11-20", 1, { createdAt: "invalid" }),
    checkIn("2026-11-23", 2, { id: "older-duplicate", createdAt: "2026-11-23T08:00:00" }),
  ];
  assert.deepEqual(buildHomeScoreInsight(polluted, both, "2026-11-23"), buildHomeScoreInsight(history, profile, "2026-11-23"));
});

test("weekly comparison preserves the existing 4am day boundary and works across the new year", () => {
  const days = [
    ...["2027-01-03", "2027-01-01", "2026-12-29"].map((date) => checkIn(date, 8)),
    ...["2026-12-28", "2026-12-26", "2026-12-22"].map((date) => checkIn(date, 6)),
  ];
  assert.equal(buildHomeScoreInsight(days, profile, "2027-01-04").currentAverage, 8);
  const beforeDawn = checkIn("2027-01-05", 8, { createdAt: "2027-01-05T02:00:00" });
  const noon = checkIn("2027-01-04", 8);
  assert.deepEqual(
    buildHomeScoreInsight([...days, beforeDawn], profile, "2027-01-04"),
    buildHomeScoreInsight([...days, noon], profile, "2027-01-04"),
  );
});

test("gap support accepts only exact quotes from this goal's supplied writing and never invents evidence", () => {
  const entry = checkIn("2026-11-23");
  const journal = {
    id: "journal", manifestationId: goalId, date: "2026-11-23",
    content: "Yesterday I showed a friend a draft and felt relieved.",
    createdAt: entry.createdAt, updatedAt: entry.createdAt,
  };
  const context = buildHomeAlignmentContext([entry], [journal], profile);
  const first = { source: "check-in", sourceId: entry.id, excerpt: "waiting to feel certain before I share my work." };
  const second = { source: "journal", sourceId: journal.id, excerpt: "I showed a friend a draft and felt relieved." };
  const invalid = [
    { ...first, excerpt: "You are afraid of being rejected." },
    { ...first, sourceId: "another-goal-record" },
    { ...first, source: "journal" },
    { ...first, excerpt: "short" },
    { ...first, excerpt: "x".repeat(201) },
    null,
  ];
  assert.deepEqual(cleanHomeGapEvidence([...invalid, first, first], context), [first]);
  assert.deepEqual(cleanHomeGapEvidence([first, second, first], context), [first, second]);
  assert.deepEqual(cleanHomeGapEvidence(undefined, context), []);
  assert.deepEqual(cleanHomeGapEvidence([first], buildHomeAlignmentContext([], [], profile)), []);
  assert.equal(context.signature, buildHomeAlignmentContext([{ ...entry, aiHomeGap: { statement: "Saved", evidence: [first], signature: "same", generatedAt: "now" } }], [journal], profile).signature);
});

test("the home overview is non-interactive while Today keeps its existing Daily Path navigation", () => {
  const { DailyFlow } = load("components/daily-flow.tsx");
  const state = { checkedIn: true, readToday: false, meditated: true };
  const overview = renderToStaticMarkup(React.createElement(DailyFlow, { ...state, interactive: false }));
  assert.ok(!overview.includes("<a "));
  assert.ok(overview.includes('aria-valuenow="2"'));
  assert.ok(overview.includes('aria-current="step"'));
  const interactive = renderToStaticMarkup(React.createElement(DailyFlow, state));
  for (const href of ["/check-in", "/review", "/tune-in"]) assert.ok(interactive.includes(`href="${href}"`));
});

test("Home has one daily CTA, a quiet completion state, and score details hidden until requested", () => {
  const { PersonalHomeHero } = createLoader({
    "@/components/home-gap-note": { HomeGapNote: () => React.createElement("p", null, "A saved personal reflection.") },
    "@/components/manifestation-focus": { ManifestationFocus: () => null },
  })("components/home-hero.tsx");
  const state = {
    user: { user_metadata: { full_name: "Alex" } },
    checkIns: history,
    latestCheckIn: history[0],
    journalEntries: [],
    todaysJournal: null,
    totalCheckIns: history.length,
    totalJournals: 0,
    hasProfile: true,
    profile,
  };
  const render = (extra) => renderToStaticMarkup(React.createElement(PersonalHomeHero, { state: { ...state, ...extra }, todayKey: "2026-11-23" }));
  const awaitingCheckIn = render({ todaysCheckIn: null, hasMeditatedToday: false });
  assert.equal((awaitingCheckIn.match(/href="\/check-in"/g) ?? []).length, 1);
  assert.match(awaitingCheckIn, /aria-expanded="false"/);
  assert.match(awaitingCheckIn, /hidden=""/);
  assert.ok(awaitingCheckIn.includes("A reflection, not a grade or a prediction."));
  assert.ok(awaitingCheckIn.includes("Your average is 2.0 higher than last week."));
  assert.ok(awaitingCheckIn.includes("Last check-in"));
  const awaitingRead = render({ todaysCheckIn: history[0], hasMeditatedToday: false });
  assert.equal((awaitingRead.match(/href="\/review"/g) ?? []).length, 1);
  assert.ok(awaitingRead.includes("Read your reflection"));
  const read = { ...history[0], readAt: "2026-11-23T13:00:00" };
  const awaitingTune = render({ todaysCheckIn: read, hasMeditatedToday: false });
  assert.equal((awaitingTune.match(/href="\/tune-in"/g) ?? []).length, 1);
  assert.ok(awaitingTune.includes("Start your Tune In"));
  const done = render({ todaysCheckIn: read, hasMeditatedToday: true });
  assert.ok(done.includes("Your day is complete"));
  assert.ok(!done.includes('href="/review"'));
  assert.ok(!done.includes('href="/check-in"'));
  assert.ok(!done.includes('href="/tune-in"'));
});

test("the gap endpoint discards unsupported quotes while preserving the personalized sentence", async () => {
  const context = buildHomeAlignmentContext([history[0]], [], profile);
  const first = { source: "check-in", sourceId: history[0].id, excerpt: "waiting to feel certain before I share my work." };
  let instructions;
  const route = createLoader({
    "@/lib/server/account": { hasServerAccount: async () => true },
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (input) => {
        instructions = input.system;
        return { enabled: true, data: {
          statement: "Waiting for certainty is delaying the work you are ready to share.",
          evidence: [first, { ...first, excerpt: "A fabricated claim about their childhood." }],
        } };
      },
    },
  })("app/api/alignment-note/route.ts");
  const response = await route.POST(new Request("http://localhost/api/alignment-note", { method: "POST", body: JSON.stringify(context) }));
  const payload = await response.json();
  assert.equal(payload.enabled, true);
  assert.deepEqual(payload.evidence, [first]);
  assert.match(instructions, /If only one entry/);
  assert.match(instructions, /Never invent a quote/);
  assert.match(instructions, /acknowledge what is holding together/);
});
